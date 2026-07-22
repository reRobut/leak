/* ==========================================================================
   guide.js — 关卡共用组件库
   ---------------------------------------------------------------------------
   包含两部分，均为“接入即用”的独立组件，供每一关的 HTML 直接引用，
   避免每新增一关就复制一遍相同的 CSS / HTML / JS：

   1. GameUI（window.GameUI）
      通用游戏 HUD 组件：血条、死亡结算画面、重生欢迎画面，
      以及它们共用的基础弹窗系统（.modal-bg / .modal / .modal-close）。
      用法（在关卡自己的 <script> 里，DOM 就绪后调用一次）：
          GameUI.initHUD({ deadImage: "dead.png" });
      之后：
          GameUI.shock(1)      // 触电：轻度，扣血
          GameUI.shock(2)      // 触电：重度，直接死亡
          GameUI.damage(30)    // 任意扣血
          GameUI.heal(20)      // 任意回血
          GameUI.resetHP()     // 重置满血
          GameUI.openModal(id) / GameUI.closeModal(id) // 通用弹窗开关

   2. 安全用电指南帮助弹窗
      在游戏窗口内插入一个“?”按钮（验电笔左侧），点击后以 iframe 弹出
      完整的《安全用电 · 现场作业手册》。样式通过 iframe + srcdoc 隔离。
   ========================================================================== */
(function () {
	"use strict";

	/* ==========================================================================
	   0. 共用基础样式（.modal-bg / .modal / .modal-close / 血条 / 死亡与重生画面）
	   只注入一次，供 GameUI 的弹窗和下方的指南弹窗共同使用。
	   ========================================================================== */
	function ensureCoreStyles() {
		if (document.getElementById("gameUICoreStyles")) return;
		const style = document.createElement("style");
		style.id = "gameUICoreStyles";
		style.textContent = `
			/* ---------- 基础弹窗系统 ---------- */
			.modal-bg {
				position: fixed;
				inset: 0;
				background: rgba(0, 0, 0, 0.78);
				backdrop-filter: blur(2px);
				display: none;
				align-items: center;
				justify-content: center;
				z-index: 90;
				padding: 24px;
			}
			.modal-bg.show {
				display: flex;
			}
			.modal {
				width: min(620px, 100%);
				max-height: 86vh;
				overflow-y: auto;
				background: var(--paper, #fff);
				border: 5px solid var(--ink, #14171a);
				border-radius: 6px;
				padding: 24px 26px;
				box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6);
				position: relative;
			}
			.modal:before {
				content: var(--modal-prefix, "🔍 特写");
				position: absolute;
				top: -14px;
				left: 20px;
				background: var(--brass, #1a56c4);
				color: #fff;
				font-size: 11px;
				padding: 3px 10px;
				border-radius: 3px;
				letter-spacing: 1px;
				font-family: "Courier New", monospace;
				border: 1px solid var(--brass-dark, #0f3480);
			}
			.modal.report:before {
				content: var(--modal-report-prefix, "📁 结案报告");
			}
			.modal.notebook-modal:before,
			.modal.menu-modal:before {
				content: none;
			}
			.modal h3 {
				margin: 0 0 4px;
				font-size: 19px;
				letter-spacing: 1px;
				color: var(--ink, #14171a);
				font-family: Georgia, serif;
			}
			.modal .sub {
				color: var(--ink-dim, #5b6068);
				font-size: 11px;
				margin-bottom: 14px;
				font-family: "Courier New", monospace;
			}
			.modal p {
				line-height: 1.8;
				font-size: 13.5px;
				color: var(--ink, #14171a);
				margin: 0 0 12px;
			}
			.modal .section-t {
				color: var(--brass, #1a56c4);
				font-size: 11.5px;
				letter-spacing: 2px;
				margin: 18px 0 8px;
				text-transform: uppercase;
				font-family: "Courier New", monospace;
			}
			.modal ul {
				margin: 0;
				padding-left: 18px;
				line-height: 1.85;
				font-size: 13px;
			}
			.modal-close {
				margin-top: 12px;
				padding: 9px 18px;
				border-radius: 20px;
				border: 2px solid var(--ink, #14171a);
				background: var(--paper, #fff);
				color: var(--ink, #14171a);
				cursor: pointer;
				font-size: 12.5px;
				letter-spacing: 1px;
				font-family: Georgia, serif;
			}
			.modal-close:hover {
				filter: brightness(0.95);
			}

			/* ---------- 血条 ---------- */
			.hp-bar {
				position: absolute;
				left: 60px;
				top: 12px;
				z-index: 96;
				width: 130px;
				height: 40px;
				padding: 0 10px;
				background: var(--paper, #fff);
				border: 2px solid var(--brass, #1a56c4);
				border-radius: 6px;
				display: flex;
				align-items: center;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
			}
			.hp-track {
				width: 100%;
				height: 12px;
				border-radius: 6px;
				overflow: hidden;
				background: var(--ink, #14171a);
				border: 1px solid #000;
			}
			.hp-fill {
				height: 100%;
				width: 100%;
				background: var(--danger, #d32f2f);
				transition: width 0.4s ease;
			}

			/* ---------- 死亡结算画面 ---------- */
			.modal.gameover {
				text-align: center;
				background: var(--ink, #14171a);
				border-color: var(--danger, #d32f2f);
			}
			.modal.gameover:before {
				content: none;
			}
			.gameover-img {
				display: block;
				max-width: 220px;
				max-height: 220px;
				width: auto;
				height: auto;
				margin: 0 auto 14px;
				border-radius: 6px;
				filter: drop-shadow(0 0 14px rgba(211, 47, 47, 0.55));
			}
			.modal.gameover h3 {
				color: var(--danger-light, #e8908c);
				font-size: 26px;
				letter-spacing: 2px;
				margin-bottom: 6px;
			}
			.modal.gameover .sub {
				color: #fff;
				font-size: 14px;
				margin-bottom: 22px;
				font-family: Georgia, serif;
				letter-spacing: 1px;
			}
			.reborn-btn {
				background: var(--paper, #fff);
				color: var(--ink, #14171a);
				border-color: var(--paper, #fff);
				font-weight: 700;
				padding: 11px 26px;
			}

			/* ---------- 重生欢迎画面 ---------- */
			.modal.reborn-modal {
				text-align: center;
				background: var(--brass, #1a56c4);
				border-color: var(--brass-dark, #0f3480);
			}
			.modal.reborn-modal:before {
				content: none;
			}
			.modal.reborn-modal h3 {
				color: #fff;
				font-size: 24px;
				letter-spacing: 2px;
				margin-bottom: 6px;
			}
			.modal.reborn-modal .sub {
				color: #dce9ff;
				font-size: 11px;
				margin-bottom: 16px;
				font-family: "Courier New", monospace;
				letter-spacing: 2px;
			}
			.modal.reborn-modal p {
				text-align: center;
				color: #fff;
			}

			/* ---------- 维修完成画面（每关内容不同，但结构/样式通用） ---------- */
			.modal.repair-modal {
				text-align: center;
				background: var(--brass, #1a56c4);
				border-color: var(--brass-dark, #0f3480);
				width: min(640px, 100%);
			}
			.modal.repair-modal:before {
				content: none;
			}
			.modal.repair-modal h3 {
				color: #fff;
				font-size: 26px;
				letter-spacing: 2px;
				margin-bottom: 6px;
			}
			.modal.repair-modal .sub {
				color: #dce9ff;
				font-size: 11px;
				margin-bottom: 18px;
				font-family: "Courier New", monospace;
				letter-spacing: 2px;
			}
			.repair-analysis {
				text-align: left;
				background: rgba(0, 0, 0, 0.18);
				border: 1px solid rgba(255, 255, 255, 0.25);
				border-radius: 6px;
				padding: 16px 18px;
				margin-bottom: 22px;
			}
			.repair-analysis p {
				color: #fff;
				font-size: 13.5px;
				line-height: 1.85;
				margin: 0 0 12px;
			}
			.repair-analysis p:last-child {
				margin-bottom: 0;
			}
			.repair-btns {
				display: flex;
				gap: 12px;
				justify-content: center;
			}
			.repair-btn {
				background: var(--paper, #fff);
				color: var(--ink, #14171a);
				border-color: var(--paper, #fff);
				font-weight: 700;
				padding: 11px 20px;
				margin-top: 0;
			}
		`;
		document.head.appendChild(style);
	}

	/* ==========================================================================
	   1. GameUI —— 血条 / 死亡画面 / 重生画面
	   ========================================================================== */
	const GameUI = (window.GameUI = window.GameUI || {});

	/* ==========================================================================
	   -1. 音效组件(GameUI.Sound / GameUI.playTripSound 等)
	   两种声音来源:
	     - 播放音频文件(如 tiaozha.mp3、dead.mp3):路径相对当前页面,文件需要和
	       页面放在同一目录下;文件缺失或浏览器还没允许自动播放时静默忽略,不影响游戏本身。
	     - 用 Web Audio API 现场合成的"嘀"声:不依赖任何音频文件。
	   ========================================================================== */
	GameUI.Sound = (function () {
		let audioCtx = null;
		function getCtx() {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return null;
			if (!audioCtx) audioCtx = new AC();
			if (audioCtx.state === "suspended") audioCtx.resume(); // 浏览器要求先有一次用户交互
			return audioCtx;
		}

		// 播放一个音频文件,src 是相对页面的路径,比如 "tiaozha.mp3"
		function playFile(src, volume) {
			try {
				const audio = new Audio(src);
				audio.volume = volume == null ? 1 : volume;
				const p = audio.play();
				if (p && typeof p.catch === "function") p.catch(() => {}); // 文件缺失/自动播放被拦截等,静默忽略
			} catch (e) {}
		}

		// 现场合成一声短促的"嘀"
		function beepOnce(delay) {
			const ctx = getCtx();
			if (!ctx) return;
			try {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "square";
				osc.frequency.value = 1800;
				osc.connect(gain);
				gain.connect(ctx.destination);
				const startAt = ctx.currentTime + (delay || 0);
				const dur = 0.11;
				gain.gain.setValueAtTime(0.0001, startAt);
				gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
				osc.start(startAt);
				osc.stop(startAt + dur + 0.02);
			} catch (e) {}
		}
		// 连续几声"嘀嘀"
		function beeps(count, gap) {
			const n = count || 2;
			const g = gap == null ? 0.16 : gap;
			for (let i = 0; i < n; i++) beepOnce(i * g);
		}

		return { playFile, beeps };
	})();

	// 三个具体场景直接调用的音效
	GameUI.playTripSound = function () {
		GameUI.Sound.playFile("tiaozha.mp3");
	}; // 跳闸
	GameUI.playDangerBeep = function () {
		GameUI.Sound.beeps(2, 0.16);
	}; // 验出强电,嘀嘀两声
	GameUI.playDeathSound = function () {
		GameUI.Sound.playFile("dead.mp3");
	}; // 触电死亡
	let hudCfg = null;
	let hudInited = false;

	const HUD_DEFAULTS = {
		container: ".game-window", // 血条挂载容器
		deadImage: "dead.png", // 死亡画面配图，加载失败会自动隐藏
		maxHP: 100,
		rebornKey: "reborn", // sessionStorage 标记位,用于 location.reload() 后识别"刚刚重生"
		rebornDelay: 400, // 重生欢迎弹窗的出现延迟(ms)
		onGameOver: null, // 可选:死亡瞬间的额外回调
		onReborn: null, // 可选:自定义"开启下一世"按钮行为,不传则默认 reload 页面
	};

	function buildHPBar(container) {
		const bar = document.createElement("div");
		bar.className = "hp-bar";
		bar.setAttribute("data-i18n-title", "hpTitle");
		bar.title = "生命值";
		bar.innerHTML = '<div class="hp-track"><div class="hp-fill" id="hpFill"></div></div>';
		container.appendChild(bar);
	}

	function buildGameOverModal() {
		const modal = document.createElement("div");
		modal.className = "modal-bg";
		modal.id = "gameOverModal";
		modal.innerHTML =
			'<div class="modal gameover">' +
			`<img class="gameover-img" src="${hudCfg.deadImage}" alt="" onerror="this.style.display='none'" />` +
			'<h3 data-i18n="gameOverTitle">⚡ 你被电死了。</h3>' +
			'<div class="sub" data-i18n="gameOverSub">下辈子注意点。</div>' +
			'<button class="modal-close reborn-btn" id="rebornBtn" data-i18n="rebornBtnText">开启下一世</button>' +
			"</div>";
		document.body.appendChild(modal);

		modal.querySelector("#rebornBtn").addEventListener("click", () => {
			if (typeof hudCfg.onReborn === "function") {
				hudCfg.onReborn();
				return;
			}
			try {
				sessionStorage.setItem(hudCfg.rebornKey, "1");
			} catch (e) {}
			location.reload();
		});
	}

	function buildRebornModal() {
		const modal = document.createElement("div");
		modal.className = "modal-bg";
		modal.id = "rebornModal";
		modal.innerHTML =
			'<div class="modal reborn-modal">' +
			'<h3 data-i18n="rebornTitle">我重生了！</h3>' +
			'<div class="sub" data-i18n="rebornSub">NEW LIFE</div>' +
			'<p data-i18n="rebornP">上一世,我在工作中因为粗心不小心被电死。这一世,我要成为电工王！</p>' +
			'<button class="modal-close reborn-btn" id="rebornStartBtn" data-i18n="rebornStartBtn">这一世,开始</button>' +
			"</div>";
		document.body.appendChild(modal);

		modal.querySelector("#rebornStartBtn").addEventListener("click", () => GameUI.closeModal("rebornModal"));
	}

	// 通用弹窗开关(仅作用于 class="modal-bg" 的元素,和宿主页面自己的 openModal/closeModal 语义一致)
	GameUI.openModal = function (id) {
		const el = document.getElementById(id);
		if (el) el.classList.add("show");
	};
	GameUI.closeModal = function (id) {
		const el = document.getElementById(id);
		if (el) el.classList.remove("show");
	};

	GameUI.updateHP = function () {
		const fill = document.getElementById("hpFill");
		if (fill) fill.style.width = Math.max(0, GameUI.hp) + "%";
	};
	GameUI.setHP = function (v) {
		GameUI.hp = Math.max(0, Math.min(GameUI.maxHP, v));
		GameUI.updateHP();
		if (GameUI.hp <= 0) GameUI.gameOver();
	};
	GameUI.damage = function (n) {
		GameUI.setHP(GameUI.hp - n);
	};
	GameUI.heal = function (n) {
		GameUI.setHP(GameUI.hp + n);
	};
	GameUI.resetHP = function (v) {
		GameUI.hp = v == null ? GameUI.maxHP : v;
		GameUI.updateHP();
	};
	// 沿用原关卡的 3 档触电语义: 0=无事 / 1=轻度触电(扣50%) / 2=重度触电(直接死亡)
	GameUI.shock = function (level) {
		if (level >= 2) {
			GameUI.hp = 0;
		} else if (level === 1) {
			GameUI.hp = Math.max(0, GameUI.hp - 50);
		}
		GameUI.updateHP();
		if (GameUI.hp <= 0) GameUI.gameOver();
	};
	GameUI.gameOver = function () {
		GameUI.playDeathSound();
		GameUI.openModal("gameOverModal");
		if (hudCfg && typeof hudCfg.onGameOver === "function") hudCfg.onGameOver();
	};

	GameUI.initHUD = function (options) {
		if (hudInited) return; // 防止被重复调用
		hudCfg = Object.assign({}, HUD_DEFAULTS, options || {});
		GameUI.maxHP = hudCfg.maxHP;
		GameUI.hp = hudCfg.maxHP;

		ensureCoreStyles();

		const container = document.querySelector(hudCfg.container) || document.body;
		buildHPBar(container);
		buildGameOverModal();
		buildRebornModal();
		GameUI.updateHP();

		// 死亡后 location.reload() 回来时,弹出"我重生了"欢迎语
		window.addEventListener("load", () => {
			let reborn = false;
			try {
				reborn = sessionStorage.getItem(hudCfg.rebornKey) === "1";
				sessionStorage.removeItem(hudCfg.rebornKey);
			} catch (e) {}
			if (reborn) setTimeout(() => GameUI.openModal("rebornModal"), hudCfg.rebornDelay);
		});

		hudInited = true;
	};

	/* ==========================================================================
	   1.4 验电笔(Meter) —— 唯一工具，右键验电，圆点+悬浮提示样式
	   每一关自己的 usePen(level) 仍然负责把 level(0/1/2) 翻译成本关语言的状态文字，
	   但外壳 DOM/CSS/圆点与笔尖的视觉状态切换统一收进这里。
	   用法（在关卡自己的 <script> 里）：
	       GameUI.initMeter();
	       function usePen(level) {
	         lastPenLevel = level;
	         const L = I18N[currentLang];
	         const statusText = level === 0 ? L.penNone : level === 1 ? L.penLow : L.penDanger;
	         GameUI.usePen(level, statusText);
	       }
	       function resetTool() {
	         lastPenLevel = null;
	         GameUI.resetMeterStandby(I18N[currentLang].meterStandby);
	       }
	   ========================================================================== */
	const METER_DEFAULTS = {
		container: ".game-window",
	};
	let meterInited = false;

	function ensureMeterStyles() {
		if (document.getElementById("gameUIMeterStyles")) return;
		const style = document.createElement("style");
		style.id = "gameUIMeterStyles";
		style.textContent = `
			.meter {
				position: absolute;
				top: 12px;
				right: 12px;
				width: 110px;
				z-index: 96;
				background: var(--paper, #fff);
				border: 3px solid var(--ink, #14171a);
				border-radius: 8px;
				padding: 8px 9px 9px;
				box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
			}
			.meter .mhead {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 6px;
				padding: 0 2px;
			}
			.meter .mhead span {
				font-size: 9px;
				letter-spacing: 1.3px;
				color: var(--ink-dim, #5b6068);
				text-transform: uppercase;
				font-family: "Courier New", monospace;
			}
			.meter .status-dot {
				width: 13px;
				height: 13px;
				border-radius: 50%;
				background: var(--ink-dim, #5b6068);
				border: 2px solid var(--ink, #14171a);
				flex-shrink: 0;
			}
			.meter .status-dot.safe {
				background: #35c96a;
				border-color: #1d7a41;
				box-shadow: 0 0 5px rgba(53, 201, 106, 0.7);
			}
			.meter .status-dot.caution {
				background: #f0c419;
				border-color: #a5820c;
				box-shadow: 0 0 5px rgba(240, 196, 25, 0.7);
			}
			.meter .status-dot.danger {
				background: var(--danger, #d32f2f);
				border-color: #7a1414;
				box-shadow: 0 0 6px rgba(211, 47, 47, 0.85);
			}
			.toolbody {
				min-height: 64px;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.pen-shape {
				position: relative;
				width: 20px;
				height: 60px;
			}
			.pen-body {
				position: absolute;
				left: 3px;
				top: 0;
				width: 14px;
				height: 44px;
				border-radius: 4px 4px 2px 2px;
				background: var(--brass, #1a56c4);
				border: 1px solid var(--brass-dark, #0f3480);
			}
			.pen-clip {
				position: absolute;
				left: 1px;
				top: 6px;
				width: 4px;
				height: 16px;
				background: var(--ink, #14171a);
				border-radius: 1px;
			}
			.pen-tip {
				position: absolute;
				left: 6px;
				top: 44px;
				width: 0;
				height: 0;
				border-left: 4px solid transparent;
				border-right: 4px solid transparent;
				border-top: 14px solid var(--ink-dim, #5b6068);
				transition: 0.2s;
			}
			.pen-tip.lvl1 {
				border-top-color: var(--danger-light, #e8908c);
				filter: drop-shadow(0 0 5px rgba(216, 144, 140, 0.9));
			}
			.pen-tip.lvl2 {
				border-top-color: var(--danger, #d32f2f);
				filter: drop-shadow(0 0 5px rgba(211, 47, 47, 0.9));
			}
			.pen-win {
				position: absolute;
				left: 5px;
				top: 12px;
				width: 10px;
				height: 10px;
				border-radius: 50%;
				background: #c7cdd3;
				border: 1px solid var(--ink-dim, #5b6068);
				transition: 0.2s;
			}
			.pen-win.lvl1 {
				background: var(--danger-light, #e8908c);
				box-shadow: 0 0 8px 2px rgba(216, 144, 140, 0.9);
				animation: gameUIBlink 0.8s infinite;
			}
			.pen-win.lvl2 {
				background: var(--danger, #d32f2f);
				box-shadow: 0 0 8px 2px rgba(211, 47, 47, 0.9);
				animation: gameUIBlink 0.45s infinite;
			}
			@keyframes gameUIBlink {
				0%,
				100% {
					opacity: 1;
				}
				50% {
					opacity: 0.2;
				}
			}
		`;
		document.head.appendChild(style);
	}

	GameUI.initMeter = function (options) {
		if (meterInited) return;
		const cfg = Object.assign({}, METER_DEFAULTS, options || {});

		ensureMeterStyles();

		const container = document.querySelector(cfg.container) || document.body;
		const meter = document.createElement("div");
		meter.className = "meter";
		meter.id = "meter";
		meter.innerHTML =
			'<div class="mhead"><span data-i18n="meterHead">右键验电</span><span class="status-dot" id="mstatus" title="待机"></span></div>' +
			'<div class="toolbody">' +
			'<div class="pen-shape">' +
			'<div class="pen-body"></div>' +
			'<div class="pen-clip"></div>' +
			'<div class="pen-win" id="penWin"></div>' +
			'<div class="pen-tip" id="penTip"></div>' +
			"</div>" +
			"</div>";
		container.appendChild(meter);

		meterInited = true;
	};

	// level: 0=无电 / 1=低压 / 2=高压;statusText 由关卡自己按当前语言算好传进来
	GameUI.usePen = function (level, statusText) {
		const mstatus = document.getElementById("mstatus");
		if (mstatus) {
			mstatus.title = statusText;
			mstatus.className = "status-dot " + (level === 0 ? "safe" : level === 1 ? "caution" : "danger");
		}
		const winClass = level === 0 ? "" : level === 1 ? "lvl1" : "lvl2";
		const win = document.getElementById("penWin");
		const tip = document.getElementById("penTip");
		if (win) win.className = "pen-win " + winClass;
		if (tip) tip.className = "pen-tip " + winClass;
	};

	// 场景切换/尚未测过时恢复"待机"外观
	GameUI.resetMeterStandby = function (standbyText) {
		const mstatus = document.getElementById("mstatus");
		if (mstatus) {
			mstatus.title = standbyText;
			mstatus.className = "status-dot";
		}
		const win = document.getElementById("penWin");
		const tip = document.getElementById("penTip");
		if (win) win.className = "pen-win";
		if (tip) tip.className = "pen-tip";
	};

	/* ==========================================================================
	   1.45 配电箱(Cabinet) + 拨动开关(Breaker Switch) —— 每一关几乎都有的柜门+总闸戏份
	   闭合的柜门(点击后打开) + 柜内一排或多排拨动开关(总闸/漏保……), 是纯 SVG 图形，
	   不方便像别的组件那样"直接 appendChild"——它得插在关卡自己场景 SVG 里的固定位置。
	   所以这里提供的是"生成 SVG 字符串的函数"，关卡在自己的 <svg> 里留一个空的 <g> 占位，
	   拿到字符串后设置 innerHTML 即可；开关本身的柜门尺寸/开关尺寸/间距都已固定好，
	   两关用下来是完全一致的视觉规格，只有"有几个开关、开关默认是开是关、每关自己的
	   开关逻辑"由关卡自己决定。

	   用法（在关卡自己的 <svg> 里）：
	       <g id="cabinetSlot"></g>
	   用法（在关卡自己的 <script> 里）：
	       document.getElementById("cabinetSlot").innerHTML =
	         GameUI.buildCabinetSVG({
	           bigLabelKey: "cabinetLabel", bigLabelDefault: "配电箱",
	           hintLabelKey: "cabinetHint", hintLabelDefault: "检查配电箱",
	           switchesHTML:
	             GameUI.breakerSwitchSVG({ id: "mainbreaker", y: 185, bigLabelKey: "mainBreakerLabel", bigLabelDefault: "总闸", smallLabelKey: "mainBreakerLabel", smallLabelDefault: "总闸", initialOn: true })
	         });
	       GameUI.wireCabinetToggle(() => { panelOpen = true; GameUI.fitAllSvgTexts(SVG_FIT_MAP); });
	       // 每次开关状态变化后:
	       GameUI.setBreakerSwitch("mainbreaker", mainSwitchOn);
	   ========================================================================== */
	function ensureCabinetStyles() {
		if (document.getElementById("gameUICabinetStyles")) return;
		const style = document.createElement("style");
		style.id = "gameUICabinetStyles";
		style.textContent = `
			.breaker-knob {
				transition: cx 0.22s ease;
			}
		`;
		document.head.appendChild(style);
	}

	// 柜门(关闭态可点开 + 打开态外壳),里面装几个开关由 switchesHTML 传入
	GameUI.buildCabinetSVG = function (options) {
		const cfg = Object.assign(
			{
				headerKey: null,
				headerDefault: "",
				bigLabelKey: "cabinetLabel",
				bigLabelDefault: "配电箱",
				bigLabelFontSize: 32,
				hintLabelKey: "cabinetHint",
				hintLabelDefault: "检查配电箱",
				switchesHTML: "",
			},
			options || {}
		);
		ensureCabinetStyles();
		const header = cfg.headerKey
			? `<text x="250" y="85" fill="#d9c79e" font-size="12" font-family="Courier New,monospace" data-i18n="${cfg.headerKey}" data-fit-width="380">${cfg.headerDefault}</text>`
			: "";
		return (
			'<g id="cabinetClosed" class="hotspot" data-action="open-panel">' +
			'<rect x="300" y="80" width="300" height="380" rx="6" class="glow-target" fill="#5c6b60" stroke="#232f2a" stroke-width="3"/>' +
			'<rect x="320" y="100" width="260" height="340" rx="4" fill="#3c4a42" stroke="#232f2a"/>' +
			`<text x="450" y="280" text-anchor="middle" fill="#c9d4cf" font-size="${cfg.bigLabelFontSize}" font-weight="bold" font-family="Georgia,serif" letter-spacing="4" data-i18n="${cfg.bigLabelKey}" data-fit-width="230">${cfg.bigLabelDefault}</text>` +
			`<text x="450" y="55" text-anchor="middle" class="lbl" font-size="13" data-i18n="${cfg.hintLabelKey}" data-fit-width="270">${cfg.hintLabelDefault}</text>` +
			"</g>" +
			'<g id="cabinetOpen" style="display:none">' +
			'<rect x="220" y="55" width="460" height="430" rx="6" fill="#465850" stroke="#232f2a" stroke-width="3"/>' +
			header +
			cfg.switchesHTML +
			"</g>"
		);
	};

	// 柜内一个拨动开关(总闸/漏保……都是这个样式,位置/文案/初始状态各关自己定)
	GameUI.breakerSwitchSVG = function (options) {
		const cfg = Object.assign(
			{
				id: "",
				x: 270,
				y: 130,
				w: 360,
				h: 150,
				bigLabelKey: "",
				bigLabelDefault: "",
				smallLabelKey: "",
				smallLabelDefault: "",
				initialOn: false,
			},
			options || {}
		);
		const cx = cfg.x + cfg.w / 2;
		const trackX = cfg.x + (cfg.w - 140) / 2;
		const trackY = cfg.y + 58;
		const knobCx = cfg.initialOn ? trackX + 110 : trackX + 30;
		const knobCy = trackY + 28;
		const fill = cfg.initialOn ? "#5f8f5a" : "#8a3a3a";
		const fitW = Math.max(60, cfg.w - 40); // 留出内边距,并且这里直接用这个开关实际的宽度算,不管调用方传了多宽的 w 都能自动适配
		return (
			`<g class="hotspot" data-id="${cfg.id}" data-touch="true" data-test="true">` +
			`<rect x="${cfg.x}" y="${cfg.y}" width="${cfg.w}" height="${cfg.h}" rx="8" fill="transparent" class="hit"/>` +
			`<text x="${cx}" y="${cfg.y + 35}" text-anchor="middle" fill="#e8e6de" font-size="22" font-weight="bold" font-family="Georgia,serif" data-i18n="${cfg.bigLabelKey}" data-fit-width="${fitW}">${cfg.bigLabelDefault}</text>` +
			`<rect id="${cfg.id}Track" x="${trackX}" y="${trackY}" width="140" height="56" rx="28" class="glow-target" fill="${fill}" stroke="#232f2a" stroke-width="2"/>` +
			`<circle id="${cfg.id}Knob" class="breaker-knob" cx="${knobCx}" cy="${knobCy}" r="22" fill="#fff" stroke="#232f2a" stroke-width="2"/>` +
			`<text x="${cx}" y="${cfg.y + 140}" text-anchor="middle" class="lbl" data-i18n="${cfg.smallLabelKey}" data-fit-width="${fitW}">${cfg.smallLabelDefault}</text>` +
			"</g>"
		);
	};

	// 扫描所有带 data-fit-width 的元素并按各自标注的宽度自动收窄——配电箱/开关这些"每关尺寸都固定"的
	// 共享组件,生成时已经把正确的可用宽度写进了 data-fit-width,关卡自己不需要再维护一份重复的 SVG_FIT_MAP
	GameUI.fitDataWidths = function () {
		document.querySelectorAll("[data-fit-width]").forEach((el) => {
			const mw = parseFloat(el.getAttribute("data-fit-width"));
			if (!isNaN(mw)) GameUI.fitSvgText(el, mw);
		});
	};

	// 开关拨动后调用,同步轨道颜色 + 滑块位置
	GameUI.setBreakerSwitch = function (id, isOn) {
		const track = document.getElementById(id + "Track");
		const knob = document.getElementById(id + "Knob");
		if (!track || !knob) return;
		track.setAttribute("fill", isOn ? "#5f8f5a" : "#8a3a3a");
		const trackX = parseFloat(track.getAttribute("x"));
		knob.setAttribute("cx", isOn ? trackX + 110 : trackX + 30);
	};

	// 柜门关闭态的点击行为:切换显示 + 回调给关卡做自己的联动(设置 panelOpen、文案、SVG 自适应等)
	GameUI.wireCabinetToggle = function (onOpen, closedId, openId) {
		closedId = closedId || "cabinetClosed";
		openId = openId || "cabinetOpen";
		const closedEl = document.getElementById(closedId);
		const openEl = document.getElementById(openId);
		if (!closedEl) return;
		closedEl.addEventListener("click", () => {
			closedEl.style.display = "none";
			if (openEl) openEl.style.display = "block";
			if (typeof onOpen === "function") onOpen(); // 关卡自己的回调里一般都会紧接着调用 GameUI.fitAllSvgTexts(SVG_FIT_MAP),data-fit-width 的收窄已经并入了那个函数,这里不用重复调用
		});
	};

	/* ==========================================================================
	   1.5 GameI18n —— 多语言引擎 + ESC 菜单（语言选择 / 继续游戏 / 放弃本关）
	   每一关的 I18N 文案字典仍然放在关卡自己的 <script> 里（因为线索、剧情等内容
	   本来就是逐关不同的），但下面这些"哪一关都长一样"的机制统一收进 GameUI：
	   - 支持的语言列表、语言检测（URL ?lang= → localStorage → 浏览器语言）
	   - data-i18n / data-i18n-html / data-i18n-title 的通用扫描与替换
	   - 语言选择弹窗(菜单)的 HTML/CSS、ESC 键呼出、放弃本关跳转
	   - 一段 SVG 大字号文字随语言变长时的自适应收窄

	   用法（在关卡自己的 <script> 里）：
	       const LANG_STORAGE_KEY = "leak_lang"; // 建议所有关卡统一用这个 key,才能真正"继承"
	       let currentLang = GameUI.detectInitialLang(I18N, LANG_STORAGE_KEY);
	       function applyLang(code) {
	         if (!I18N[code]) code = "zh-CN";
	         currentLang = code;
	         GameUI.saveLang(code, LANG_STORAGE_KEY);
	         GameUI.syncLangUrl(code);
	         document.documentElement.lang = code;
	         GameUI.applyDataI18n(I18N[code], code);
	         GameUI.fitAllSvgTexts(SVG_FIT_MAP); // 没有超长文字可以不传
	         // ...关卡自己的联动刷新(验电笔当前档位/线索本是否开着等)
	       }
	       GameUI.initMenu({
	         mapUrl: "index.html",
	         getCurrentLang: () => currentLang,
	         getGiveUpConfirmText: () => I18N[currentLang].giveUpConfirm,
	         onLangSelect: applyLang,
	       });
	       applyLang(currentLang);
	   ========================================================================== */
	GameUI.LANG_META = [
		{ code: "en", native: "English" },
		{ code: "zh-CN", native: "简体中文" },
		{ code: "zh-TW", native: "繁體中文" },
		{ code: "de", native: "Deutsch" },
		{ code: "fr", native: "Français" },
		{ code: "ru", native: "Русский" },
		{ code: "ja", native: "日本語" },
		{ code: "pt-BR", native: "Português (Brasil)" },
		{ code: "es-LA", native: "Español (Latinoamérica)" },
		{ code: "ko", native: "한국어" },
	];

	// URL ?lang= → localStorage(跨关卡共用同一个 key,实现"语言继承") → 浏览器语言 → 英文兜底
	GameUI.detectInitialLang = function (supportedDict, storageKey) {
		try {
			const urlLang = new URLSearchParams(location.search).get("lang");
			if (urlLang && supportedDict[urlLang]) return urlLang;
		} catch (e) {}
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved && supportedDict[saved]) return saved;
		} catch (e) {}
		const nav = (navigator.language || "en").toLowerCase();
		if (nav.startsWith("zh-tw") || nav.startsWith("zh-hk")) return "zh-TW";
		if (nav.startsWith("zh")) return "zh-CN";
		if (nav.startsWith("de")) return "de";
		if (nav.startsWith("fr")) return "fr";
		if (nav.startsWith("ru")) return "ru";
		if (nav.startsWith("ja")) return "ja";
		if (nav.startsWith("pt")) return "pt-BR";
		if (nav.startsWith("es")) return "es-LA";
		if (nav.startsWith("ko")) return "ko";
		return "en";
	};

	GameUI.saveLang = function (code, storageKey) {
		try {
			localStorage.setItem(storageKey, code);
		} catch (e) {}
	};

	// 同步地址栏 ?lang= ,这样死亡后 location.reload() 或分享链接时,语言不会被冲掉
	GameUI.syncLangUrl = function (code) {
		try {
			const url = new URL(location.href);
			url.searchParams.set("lang", code);
			history.replaceState(null, "", url);
		} catch (e) {}
	};

	/* ---------- 共享词汇表：配电箱/总闸/漏保这些"哪一关都出现"的物件名称，统一在这里翻译一份，
	   避免每一关各翻各的、用词悄悄跑偏(比如"配电箱"一关叫 Sicherungskasten 另一关叫 Verteiler)。
	   GameUI.buildCabinetSVG() / breakerSwitchSVG() 默认就用这里的 key,关卡自己的 I18N 字典
	   不需要再重复定义这几个 key。如果某一关確有更贴切的说法,可以在调用建造函数时传入自己的
	   bigLabelKey/bigLabelDefault 覆盖,不强制。 ---------- */
	GameUI.GLOSSARY = {
		"zh-CN": { cabinetLabel: "配电箱", cabinetHint: "检查配电箱", mainBreakerLabel: "总闸", rcdLabel: "漏电保护", rcdLbl: "漏电保护器" },
		"zh-TW": { cabinetLabel: "配電箱", cabinetHint: "檢查配電箱", mainBreakerLabel: "總開關", rcdLabel: "漏電保護", rcdLbl: "漏電保護器" },
		en: { cabinetLabel: "ELECTRICAL PANEL", cabinetHint: "Inspect the electrical panel", mainBreakerLabel: "MAIN", rcdLabel: "RCD", rcdLbl: "RCD (Earth Leakage Breaker)" },
		de: { cabinetLabel: "SICHERUNGSKASTEN", cabinetHint: "Sicherungskasten untersuchen", mainBreakerLabel: "HAUPTSCHALTER", rcdLabel: "FI-SCHALTER", rcdLbl: "FI-Schutzschalter" },
		fr: { cabinetLabel: "TABLEAU ÉLECTRIQUE", cabinetHint: "Inspecter le tableau électrique", mainBreakerLabel: "DISJONCTEUR PRINCIPAL", rcdLabel: "DIFFÉRENTIEL", rcdLbl: "Disjoncteur différentiel" },
		ru: { cabinetLabel: "ЭЛЕКТРОЩИТ", cabinetHint: "Осмотреть электрощит", mainBreakerLabel: "ГЛАВНЫЙ РУБИЛЬНИК", rcdLabel: "УЗО", rcdLbl: "Устройство защитного отключения" },
		ja: { cabinetLabel: "分電盤", cabinetHint: "分電盤を調べる", mainBreakerLabel: "主幹ブレーカー", rcdLabel: "漏電遮断器", rcdLbl: "漏電遮断器(ブレーカー)" },
		"pt-BR": { cabinetLabel: "QUADRO DE DISTRIBUIÇÃO", cabinetHint: "Inspecionar o quadro de distribuição", mainBreakerLabel: "DISJUNTOR GERAL", rcdLabel: "DR", rcdLbl: "Disjuntor diferencial residual (DR)" },
		"es-LA": { cabinetLabel: "TABLERO ELÉCTRICO", cabinetHint: "Inspeccionar el tablero eléctrico", mainBreakerLabel: "INTERRUPTOR PRINCIPAL", rcdLabel: "DIFERENCIAL", rcdLbl: "Interruptor diferencial" },
		ko: { cabinetLabel: "배전함", cabinetHint: "배전함 조사하기", mainBreakerLabel: "메인 차단기", rcdLabel: "누전 차단기", rcdLbl: "누전 차단기(ELB)" },
	};

	// 通用扫描 [data-i18n] / [data-i18n-html] / [data-i18n-title],以及弹窗左上角小标签的 CSS 变量
	// L 是关卡自己的语言字典,GameUI.GLOSSARY 是共享组件词汇表——两者合并,共享词汇表优先(保证跨关卡统一),
	// 关卡自己的 key 互不冲突,照常生效。
	GameUI.applyDataI18n = function (L, code) {
		if (!L) return;
		const glossary = GameUI.GLOSSARY[code] || GameUI.GLOSSARY["zh-CN"];
		const merged = Object.assign({}, L, glossary);
		document.querySelectorAll("[data-i18n]").forEach((el) => {
			const k = el.getAttribute("data-i18n");
			if (merged[k] !== undefined) el.textContent = merged[k];
		});
		document.querySelectorAll("[data-i18n-html]").forEach((el) => {
			const k = el.getAttribute("data-i18n-html");
			if (merged[k] !== undefined) el.innerHTML = merged[k];
		});
		document.querySelectorAll("[data-i18n-title]").forEach((el) => {
			const k = el.getAttribute("data-i18n-title");
			if (merged[k] !== undefined) el.title = merged[k];
		});
		document.querySelectorAll(".modal").forEach((m) => m.style.setProperty("--modal-prefix", `"${L.zoomPrefix || ""}"`));
		document.querySelectorAll(".modal.report").forEach((m) => m.style.setProperty("--modal-report-prefix", `"${L.reportPrefix || ""}"`));
		if (code) {
			document.querySelectorAll(".lang-pick-btn").forEach((el) => el.classList.toggle("active", el.dataset.code === code));
		}
	};

	// 部分语言(如德语)单词明显更长,场景大标题等 SVG 文字超宽时自动处理,而不是任由它溢出:
	// 文字里有空格(多个单词)就按词数从中间拆成两行;没有空格(单个长词,拆不了)才压缩字距/字宽。
	GameUI.fitSvgText = function (el, maxWidth) {
		// 如果上一次语言切换把它拆成了两行,这次先拼回单行原文再重新判断——
		// 换成更短的语言之后,可能已经不需要再拆行了
		if (el.querySelector("tspan")) {
			el.textContent = Array.from(el.querySelectorAll("tspan"))
				.map((t) => t.textContent)
				.join(" ");
		}
		el.removeAttribute("textLength");
		el.removeAttribute("lengthAdjust");

		let len = 0;
		try {
			len = el.getComputedTextLength();
		} catch (e) {
			return; // 元素当前不可见(所在场景未激活)时测不出宽度,交给场景切换/开门时的调用来补上
		}
		if (len <= maxWidth) return; // 没超,不用处理

		const text = el.textContent;
		const words = text.trim().split(/\s+/);

		if (words.length < 2) {
			// 没有空格可拆,只能压缩字距/字宽
			el.setAttribute("textLength", maxWidth);
			el.setAttribute("lengthAdjust", "spacingAndGlyphs");
			return;
		}

		// 有空格:按词数从中间拆成两行,分别居中对齐在原来的 x 上
		const x = el.getAttribute("x");
		const yBase = parseFloat(el.getAttribute("y")) || 0;
		const fontSize = parseFloat(el.getAttribute("font-size")) || parseFloat(getComputedStyle(el).fontSize) || 16;
		const lineGap = fontSize * 1.05;
		const mid = Math.ceil(words.length / 2);
		const lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];

		el.textContent = "";
		const svgNS = "http://www.w3.org/2000/svg";
		lines.forEach((line, i) => {
			const tspan = document.createElementNS(svgNS, "tspan");
			tspan.setAttribute("x", x);
			tspan.setAttribute("y", yBase + (i === 0 ? -lineGap * 0.55 : lineGap * 0.55));
			tspan.textContent = line;
			el.appendChild(tspan);
			let lineLen = 0;
			try {
				lineLen = tspan.getComputedTextLength();
			} catch (e) {}
			if (lineLen > maxWidth) {
				// 拆开之后某一行还是太长(比如某个词本身就很长),这一行单独再压缩兜底
				tspan.setAttribute("textLength", maxWidth);
				tspan.setAttribute("lengthAdjust", "spacingAndGlyphs");
			}
		});
	};
	GameUI.fitAllSvgTexts = function (map) {
		GameUI.fitDataWidths(); // 配电箱/总闸/漏保这些共享组件,凡是标了 data-fit-width 的,每次调用这里都顺带收一遍
		(map || []).forEach(({ selector, maxWidth }) => {
			document.querySelectorAll(selector).forEach((el) => GameUI.fitSvgText(el, maxWidth));
		});
	};

	GameUI.buildLangPicker = function (containerId, onSelect) {
		const grid = document.getElementById(containerId);
		if (!grid) return;
		grid.innerHTML = "";
		GameUI.LANG_META.forEach(({ code, native }) => {
			const btn = document.createElement("div");
			btn.className = "lang-pick-btn";
			btn.dataset.code = code;
			btn.textContent = native;
			btn.addEventListener("click", () => onSelect(code));
			grid.appendChild(btn);
		});
	};

	function ensureMenuStyles() {
		if (document.getElementById("gameUIMenuStyles")) return;
		const style = document.createElement("style");
		style.id = "gameUIMenuStyles";
		style.textContent = `
			.menu-modal {
				width: min(480px, 100%);
			}
			.menu-modal:before {
				content: none;
			}
			.lang-pick-grid {
				display: grid;
				grid-template-columns: repeat(2, 1fr);
				gap: 8px;
				margin-bottom: 6px;
			}
			.lang-pick-btn {
				display: flex;
				flex-direction: column;
				align-items: flex-start;
				gap: 1px;
				padding: 9px 11px;
				border: 2px solid var(--ink, #14171a);
				border-radius: 8px;
				background: var(--paper-dark, #eef1f6);
				color: var(--ink, #14171a);
				cursor: pointer;
				font-family: Georgia, serif;
				font-weight: 700;
				font-size: 12.5px;
				transition: transform 0.1s ease, background 0.15s ease;
			}
			.lang-pick-btn:hover {
				background: #e2e7ee;
			}
			.lang-pick-btn.active {
				background: var(--brass, #1a56c4);
				color: #fff;
				border-color: var(--brass-dark, #0f3480);
			}
			.lang-pick-btn small {
				font-weight: 500;
				opacity: 0.75;
				font-size: 0.82em;
				font-family: "Courier New", monospace;
			}
			.menu-actions {
				display: flex;
				flex-direction: column;
				gap: 10px;
				margin-top: 18px;
			}
			.menu-actions .modal-close {
				width: 100%;
				margin-top: 0;
				padding: 11px 18px;
			}
			.giveup-btn {
				background: var(--danger, #d32f2f);
				border-color: var(--danger, #d32f2f);
				color: #fff;
				font-weight: 700;
			}
			.giveup-btn:hover {
				filter: brightness(1.08);
			}
		`;
		document.head.appendChild(style);
	}

	const MENU_DEFAULTS = {
		mapUrl: "index.html", // "放弃本关"跳转的关卡地图页面
		getCurrentLang: () => "zh-CN",
		getGiveUpConfirmText: () => "确定要放弃本关并返回主页吗？当前进度不会保存。",
		onLangSelect: null, // 必填: function(code) { ...applyLang(code)... }
	};
	let menuInited = false;

	// 注入 ESC 菜单(语言选择 + 继续游戏 + 放弃本关),并接管 ESC 键:
	// 有其它弹窗开着就先关它,死亡结算弹窗打开时 ESC 不生效,都没有则切换菜单本身
	GameUI.initMenu = function (options) {
		if (menuInited) return;
		const cfg = Object.assign({}, MENU_DEFAULTS, options || {});

		ensureCoreStyles();
		ensureMenuStyles();

		const modal = document.createElement("div");
		modal.className = "modal-bg";
		modal.id = "menuModal";
		modal.innerHTML =
			'<div class="modal menu-modal">' +
			'<h3 data-i18n="menuTitle">游戏菜单</h3>' +
			'<div class="section-t" data-i18n="menuLangTitle">选择语言</div>' +
			'<div class="lang-pick-grid" id="langPickGrid"></div>' +
			'<div class="menu-actions">' +
			'<button class="modal-close" id="resumeBtn" data-i18n="resumeBtn">继续游戏</button>' +
			'<button class="modal-close giveup-btn" id="giveUpBtn" data-i18n="giveUpBtn">放弃本关，返回主页</button>' +
			"</div>" +
			"</div>";
		document.body.appendChild(modal);

		modal.querySelector("#resumeBtn").addEventListener("click", () => GameUI.closeModal("menuModal"));
		modal.querySelector("#giveUpBtn").addEventListener("click", () => {
			if (confirm(cfg.getGiveUpConfirmText())) {
				location.href = `${cfg.mapUrl}?lang=${encodeURIComponent(cfg.getCurrentLang())}`;
			}
		});
		modal.addEventListener("click", (e) => {
			if (e.target === modal) GameUI.closeModal("menuModal");
		});
		document.addEventListener("keydown", (e) => {
			if (e.key !== "Escape" && e.key !== "Esc") return;
			const goModal = document.getElementById("gameOverModal");
			if (goModal && goModal.classList.contains("show")) return; // 死亡结算不允许用 ESC 绕过
			const openOthers = Array.from(document.querySelectorAll(".modal-bg.show")).filter((el) => el.id !== "menuModal");
			if (openOthers.length > 0) {
				openOthers.forEach((el) => el.classList.remove("show"));
				return;
			}
			modal.classList.toggle("show");
		});

		GameUI.buildLangPicker("langPickGrid", (code) => {
			if (typeof cfg.onLangSelect === "function") cfg.onLangSelect(code);
		});

		menuInited = true;
	};

	/* ==========================================================================
	   2. 安全用电指南帮助弹窗
	   独立组件：在游戏界面验电笔(meter)左侧插入一个"?"按钮，
	   点击后以 iframe 方式弹出完整的《安全用电 · 现场作业手册》。
	   使用 iframe + srcdoc 做样式隔离，不会与宿主页面的样式互相污染。
	   ========================================================================== */

	/* -------------------- 多语言文案（与宿主页面语言代码保持一致: en / zh-CN / zh-TW / de / fr / ru / ja / pt-BR / es-LA / ko） -------------------- */
	const GUIDE_I18N = {"zh-CN":{"title":"游戏指南","navBrand":"安全用电手册","tab1":"三相电基础","tab2":"接线组合与应用","heroEyebrow":"GAME MANUAL · 电工作业入门","heroTitle":"游戏指南","heroSub":"点击上方标签跳转，或直接向下滚动阅读。","sec1Title":"什么是三相电","sec1Sub":"家里插座用的是单相电，而商场、工厂、写字楼背后用的大多是三相电。","card1Tag":"家庭常见","card1Title":"单相电","card1Desc":"只有一根火线加一根零线，电流像一条单车道，功率有限，适合照明、插座这类小功率设备。","card2Tag":"商业/工业常见","card2Title":"三相电","card2Desc":"由三根相位错开的火线组成，像三条车道同时供电，能稳定输出更大功率，专门用来驱动电机、压缩机这类“大力气”设备。","tipLabel":"记住：","tipText":"三相电本身不是给人接触用的插座电，它主要是“喂”给电梯、空调机组、大型水泵、工业电机这类需要大功率、持续运转的设备。","sec2Title":"接线组合与应用范围","sec2Sub":"同样是“三根火线”，搭配不同数量的零线和地线，就是不同的国际标准，适用的地区和设备也不一样。","wire1Title":"三火一零一地","wire1Cn":"（三相五线制：3条火线 + 1条零线 + 1条地线）","wire1Code":"TN-C-S / TN-S","wire1Desc":"国际上应用最广的商业配电标准，广泛用于欧洲、中国及亚洲多数地区的写字楼、商场总配电、电梯、中央空调机组、大型水泵、充电桩等场所。","wire2Title":"三火一地","wire2Cn":"（三相三线制，另加1条保护地线，不含零线）","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"和五线制属于同一套建筑接地系统，只是这条支路不接零线——因为电机这类负载不需要单相220/230V。常见于工厂车间、仓库这类动力配电，专门驱动大功率工业电机、压缩机、传送带、大型通风设备，北美对应的说法是480V Delta。","wire3Title":"三火一零","wire3Cn":"（三相四线制：3条火线 + 1条零线，星形接法）","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"北美城市商业建筑常见接法，同一套配电既给办公楼插座供120V，也给电梯、空调这类设备供208V，是写字楼和数据中心的典型配置。部分北美老旧商业建筑用的是三角形接法、从其中一相中点引出零线的变体（High-Leg Delta），同样是3火1零，但零线只能从其中两相安全取出120V，第三相俗称“高腿”（High Leg），不能直接接单相负载。","wire4Title":"三火","wire4Cn":"（三相三线制：3条火线，三角形接法，不含零线）","wire4Code":"NEC 240V Delta","wire4Desc":"常见于北美一些老式商业建筑或轻工业场所，专门驱动电机等纯动力设备。","glossaryHead":"术语速查","glossaryLabel":"· ABBREVIATIONS","g1Code":"T","g1Desc":"Terra，电源或用户直接接地","g2Code":"N","g2Desc":"Neutral，借用电源的零线来接地","g3Code":"I","g3Desc":"Isolated，电源不接地或经高阻抗接地","g4Code":"S","g4Desc":"Separate，零线和地线全程分开走","g5Code":"C","g5Desc":"Combined，零线和地线合并走一段","g6Code":"TT","g6Desc":"电源接地，用户另打一根地线，两者不共用","g7Code":"TN-S","g7Desc":"电源接地，借用零线接地，零线地线全程分开","g8Code":"TN-C-S","g8Desc":"前段零线地线合并，进楼后再分开（欧洲/中国常见）","g9Code":"NEC","g9Desc":"美国国家电气规范，北美不用TN/TT/IT分类","footer":"本页面用于科普说明，帮助理解不同地区商业三相电的常见接线思路。实际用电和线路改造请务必遵循当地电气规范，由持证电工操作，不要自行拆装配电箱或触碰不明线路。"},"zh-TW":{"title":"遊戲指南","navBrand":"安全用電手冊","tab1":"三相電基礎","tab2":"接線組合與應用","heroEyebrow":"GAME MANUAL · 電工作業入門","heroTitle":"遊戲指南","heroSub":"點擊上方標籤跳轉，或直接向下滾動閱讀。","sec1Title":"什麼是三相電","sec1Sub":"家裡插座用的是單相電，而賣場、工廠、辦公大樓背後用的大多是三相電。","card1Tag":"家庭常見","card1Title":"單相電","card1Desc":"只有一條火線加一條中性線，電流像一條單車道，功率有限，適合照明、插座這類小功率設備。","card2Tag":"商業/工業常見","card2Title":"三相電","card2Desc":"由三條相位錯開的火線組成，像三條車道同時供電，能穩定輸出更大功率，專門用來驅動馬達、壓縮機這類「大力氣」設備。","tipLabel":"記住：","tipText":"三相電本身不是給人接觸用的插座電，它主要是「餵」給電梯、空調機組、大型水泵、工業馬達這類需要大功率、持續運轉的設備。","sec2Title":"接線組合與應用範圍","sec2Sub":"同樣是「三條火線」，搭配不同數量的中性線和地線，就是不同的國際標準，適用的地區和設備也不一樣。","wire1Title":"三火一零一地","wire1Cn":"（三相五線制：3條火線＋1條中性線＋1條地線）","wire1Code":"TN-C-S / TN-S","wire1Desc":"國際上應用最廣的商業配電標準，廣泛用於歐洲、中國及亞洲多數地區的辦公大樓、賣場總配電、電梯、中央空調機組、大型水泵、充電樁等場所。","wire2Title":"三火一地","wire2Cn":"（三相三線制，另加1條保護地線，不含中性線）","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"和五線制屬於同一套建築接地系統，只是這條支路不接中性線——因為馬達這類負載不需要單相220/230V。常見於工廠廠房、倉庫這類動力配電，專門驅動大型工業馬達、壓縮機、輸送帶、大型通風設備，北美對應的說法是480V Delta。","wire3Title":"三火一零","wire3Cn":"（三相四線制：3條火線＋1條中性線，星形接法）","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"北美城市商業大樓常見接法，同一套配電既給辦公室插座供120V，也給電梯、空調這類設備供208V，是辦公大樓和資料中心的標準配置。部分北美老舊商業大樓用的是三角形接法、從其中一相中點引出中性線的變體（High-Leg Delta），同樣是3火1零，但中性線只能從其中兩相安全取出120V，第三相俗稱「高腳」（High Leg），不能直接接單相負載。","wire4Title":"三火","wire4Cn":"（三相三線制：3條火線，三角形接法，不含中性線）","wire4Code":"NEC 240V Delta","wire4Desc":"常見於北美一些老舊商業大樓或輕工業場所，專門驅動馬達等純動力設備。","glossaryHead":"術語速查","glossaryLabel":"· ABBREVIATIONS","g1Code":"T","g1Desc":"Terra，電源或用戶直接接地","g2Code":"N","g2Desc":"Neutral，借用電源的中性線來接地","g3Code":"I","g3Desc":"Isolated，電源不接地或經高阻抗接地","g4Code":"S","g4Desc":"Separate，中性線和地線全程分開走","g5Code":"C","g5Desc":"Combined，中性線和地線合併走一段","g6Code":"TT","g6Desc":"電源接地，用戶另打一根地線，兩者不共用","g7Code":"TN-S","g7Desc":"電源接地，借用中性線接地，中性線地線全程分開","g8Code":"TN-C-S","g8Desc":"前段中性線地線合併，進樓後再分開（歐洲/中國常見）","g9Code":"NEC","g9Desc":"美國國家電氣規範，北美不用TN/TT/IT分類","footer":"本頁面用於科普說明，幫助理解不同地區商業三相電的常見接線思路。實際用電和線路改造請務必遵循當地電氣規範，由持證電工操作，不要自行拆裝配電箱或觸碰不明線路。"},"en":{"title":"Game Guide","navBrand":"Electrical Safety Manual","tab1":"Three-Phase Basics","tab2":"Wiring & Applications","heroEyebrow":"GAME MANUAL · ELECTRICIAN BASICS","heroTitle":"Game Guide","heroSub":"Tap a tab above to jump to a section, or just scroll down to read.","sec1Title":"What Is Three-Phase Power","sec1Sub":"Household outlets run on single-phase power, while malls, factories, and office buildings mostly run on three-phase power.","card1Tag":"Home","card1Title":"Single-Phase Power","card1Desc":"One live wire plus one neutral wire, like a single-lane road. Limited power, suited to lighting and small appliances.","card2Tag":"Commercial / Industrial","card2Title":"Three-Phase Power","card2Desc":"Three live wires offset in phase, like three lanes supplying power at once. It delivers steady, higher power and drives motors, compressors, and other heavy-duty equipment.","tipLabel":"Remember:","tipText":"Three-phase power isn’t meant for people to touch directly. It mainly “feeds” high-power, continuously running equipment like elevators, HVAC units, large pumps, and industrial motors.","sec2Title":"Wiring Combinations & Applications","sec2Sub":"Three live wires paired with different numbers of neutral and ground wires make up different international standards, each common in different regions and devices.","wire1Title":"3 Live + 1 Neutral + 1 Ground","wire1Cn":"(5-wire three-phase: 3 live + 1 neutral + 1 ground)","wire1Code":"TN-C-S / TN-S","wire1Desc":"The most widely used commercial distribution standard worldwide. Common across Europe, China, and most of Asia for main distribution in office buildings and malls, elevators, central A/C units, large pumps, and EV chargers.","wire2Title":"3 Live + 1 Ground","wire2Cn":"(3-phase three-wire, plus a separate protective ground, no neutral)","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"Part of the same building earthing system as the 5-wire setup — this branch simply doesn’t carry a neutral, since motor loads don’t need single-phase 220/230V. Common on factory floors and in warehouses to drive industrial motors, large compressors, conveyor belts, and large ventilation equipment. The North American equivalent is called 480V Delta.","wire3Title":"3 Live + 1 Neutral","wire3Cn":"(4-wire three-phase, wye/star configuration)","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"Common in North American urban commercial buildings. The same feed supplies 120V to office outlets and 208V three-phase to elevators and A/C equipment — the standard setup for office towers and data centers. Some older North American commercial buildings instead use a delta variant with a neutral tapped from the midpoint of one winding (High-Leg Delta) — also 3 live + 1 neutral, but only two phases can safely supply 120V; the third, called the “high leg,” can’t be used for single-phase loads.","wire4Title":"3 Live","wire4Cn":"(3-phase three-wire, delta configuration, no neutral)","wire4Code":"NEC 240V Delta","wire4Desc":"Common in older North American commercial buildings or light-industrial sites, dedicated to driving motors and other pure power loads.","glossaryHead":"Glossary","glossaryLabel":"· ABBREVIATIONS","g1Code":"T","g1Desc":"Terra — source or installation is directly earthed","g2Code":"N","g2Desc":"Neutral — earthing is derived from the source’s neutral conductor","g3Code":"I","g3Desc":"Isolated — source is not earthed, or earthed through high impedance","g4Code":"S","g4Desc":"Separate — neutral and protective earth run as separate conductors throughout","g5Code":"C","g5Desc":"Combined — neutral and earth are combined into one conductor for part of the run","g6Code":"TT","g6Desc":"Source is earthed; the installation has its own separate earth electrode, not shared","g7Code":"TN-S","g7Desc":"Source is earthed; installation earthing is derived from the neutral, kept separate throughout","g8Code":"TN-C-S","g8Desc":"Neutral and earth are combined upstream, then split apart inside the building (common in Europe/China)","g9Code":"NEC","g9Desc":"US National Electrical Code — North America doesn’t use the TN/TT/IT classification","footer":"This page is for educational purposes, to help explain common commercial three-phase wiring approaches across regions. For real-world wiring or modifications, always follow local electrical codes and have a licensed electrician do the work — never open a panel or touch unknown wiring yourself."},"de":{"title":"Spielanleitung","navBrand":"Handbuch für elektrische Sicherheit","tab1":"Drehstrom-Grundlagen","tab2":"Verdrahtung & Anwendung","heroEyebrow":"GAME MANUAL · ELEKTRIKER-GRUNDLAGEN","heroTitle":"Spielanleitung","heroSub":"Tippen Sie oben auf einen Tab, um zu einem Abschnitt zu springen, oder scrollen Sie einfach nach unten.","sec1Title":"Was ist Drehstrom","sec1Sub":"Haushaltssteckdosen laufen mit einphasigem Strom, während Einkaufszentren, Fabriken und Bürogebäude meist mit Drehstrom versorgt werden.","card1Tag":"Zuhause","card1Title":"Einphasenstrom","card1Desc":"Ein Außenleiter plus ein Neutralleiter — wie eine einspurige Straße. Begrenzte Leistung, geeignet für Beleuchtung und kleine Geräte.","card2Tag":"Gewerbe / Industrie","card2Title":"Drehstrom","card2Desc":"Drei phasenverschobene Außenleiter — wie drei Fahrspuren, die gleichzeitig Strom liefern. Er liefert stabil höhere Leistung und treibt Motoren, Kompressoren und andere Schwerlastgeräte an.","tipLabel":"Merken Sie sich:","tipText":"Drehstrom ist nicht für den direkten menschlichen Kontakt gedacht. Er versorgt vor allem leistungsstarke, dauerhaft laufende Geräte wie Aufzüge, Klimaanlagen, große Pumpen und Industriemotoren.","sec2Title":"Verdrahtungskombinationen & Anwendungen","sec2Sub":"Drei Außenleiter, kombiniert mit unterschiedlich vielen Neutral- und Erdungsleitern, ergeben unterschiedliche internationale Standards — üblich in unterschiedlichen Regionen und Geräten.","wire1Title":"3 Außenleiter + 1 Neutralleiter + 1 Erdung","wire1Cn":"(5-Leiter-Drehstrom: 3 Außenleiter + 1 Neutralleiter + 1 Schutzleiter)","wire1Code":"TN-C-S / TN-S","wire1Desc":"Der weltweit am weitesten verbreitete Standard für gewerbliche Verteilung. Üblich in Europa, China und weiten Teilen Asiens für die Hauptverteilung in Bürogebäuden und Einkaufszentren, Aufzüge, zentrale Klimaanlagen, große Pumpen und Ladesäulen.","wire2Title":"3 Außenleiter + 1 Erdung","wire2Cn":"(Drehstrom-Dreileiter, zusätzlicher Schutzleiter, ohne Neutralleiter)","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"Teil desselben Gebäude-Erdungssystems wie die 5-Leiter-Variante — dieser Abzweig führt nur keinen Neutralleiter, da Motorlasten kein einphasiges 220/230V benötigen. Üblich in Fabrikhallen und Lagern zum Antrieb von Industriemotoren, großen Kompressoren, Förderbändern und großen Lüftungsanlagen. In Nordamerika entspricht das dem 480V Delta.","wire3Title":"3 Außenleiter + 1 Neutralleiter","wire3Cn":"(4-Leiter-Drehstrom, Sternschaltung)","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"Üblich in nordamerikanischen Geschäftsgebäuden. Dieselbe Zuleitung liefert 120V an Bürosteckdosen und 208V Drehstrom an Aufzüge und Klimageräte — Standard in Bürotürmen und Rechenzentren. Manche ältere nordamerikanische Gewerbegebäude nutzen stattdessen eine Dreieck-Variante mit einem am Mittelpunkt einer Wicklung angezapften Neutralleiter (High-Leg Delta) — ebenfalls 3 Außenleiter + 1 Neutralleiter, aber nur zwei Phasen liefern sicher 120V; die dritte, das „High Leg“, darf nicht für einphasige Lasten genutzt werden.","wire4Title":"3 Außenleiter","wire4Cn":"(Drehstrom-Dreileiter, Dreieckschaltung, ohne Neutralleiter)","wire4Code":"NEC 240V Delta","wire4Desc":"Üblich in älteren nordamerikanischen Gewerbegebäuden oder leichter Industrie, ausschließlich zum Antrieb von Motoren und anderen reinen Kraftverbrauchern.","glossaryHead":"Begriffserklärung","glossaryLabel":"· ABKÜRZUNGEN","g1Code":"T","g1Desc":"Terra — Quelle oder Anlage direkt geerdet","g2Code":"N","g2Desc":"Neutral — Erdung wird vom Neutralleiter der Quelle abgeleitet","g3Code":"I","g3Desc":"Isolated — Quelle nicht geerdet oder über hohe Impedanz geerdet","g4Code":"S","g4Desc":"Separate — Neutral- und Schutzleiter durchgehend getrennt geführt","g5Code":"C","g5Desc":"Combined — Neutral- und Schutzleiter auf einem Abschnitt kombiniert","g6Code":"TT","g6Desc":"Quelle geerdet; Anlage hat eigene, separate Erdung, nicht gemeinsam genutzt","g7Code":"TN-S","g7Desc":"Quelle geerdet; Anlagenerdung vom Neutralleiter abgeleitet, durchgehend getrennt geführt","g8Code":"TN-C-S","g8Desc":"Neutral- und Erdleiter vorgelagert kombiniert, im Gebäude dann getrennt (üblich in Europa/China)","g9Code":"NEC","g9Desc":"US National Electrical Code — Nordamerika nutzt nicht die TN/TT/IT-Klassifizierung","footer":"Diese Seite dient nur der Erklärung gängiger gewerblicher Drehstrom-Verdrahtungen in verschiedenen Regionen. Bei realen Installationen oder Änderungen immer die örtlichen Vorschriften befolgen und einen lizenzierten Elektriker beauftragen — öffnen Sie niemals selbst einen Schaltschrank oder berühren Sie unbekannte Leitungen."},"fr":{"title":"Guide du jeu","navBrand":"Manuel de sécurité électrique","tab1":"Bases du triphasé","tab2":"Câblage & applications","heroEyebrow":"GAME MANUAL · BASES D'ÉLECTRICIEN","heroTitle":"Guide du jeu","heroSub":"Cliquez sur un onglet ci-dessus pour accéder à une section, ou faites défiler vers le bas.","sec1Title":"Qu'est-ce que le triphasé","sec1Sub":"Les prises domestiques fonctionnent en monophasé, tandis que les centres commerciaux, usines et immeubles de bureaux sont surtout alimentés en triphasé.","card1Tag":"Domicile","card1Title":"Courant monophasé","card1Desc":"Un fil de phase plus un neutre — comme une route à une voie. Puissance limitée, adapté à l'éclairage et aux petits appareils.","card2Tag":"Commercial / Industriel","card2Title":"Courant triphasé","card2Desc":"Trois fils de phase décalés — comme trois voies alimentant en même temps. Il fournit une puissance élevée et stable, utilisé pour entraîner moteurs, compresseurs et autres équipements lourds.","tipLabel":"À retenir :","tipText":"Le triphasé n'est pas destiné à être touché directement. Il alimente surtout des équipements puissants et en fonctionnement continu comme les ascenseurs, la climatisation, les grosses pompes et les moteurs industriels.","sec2Title":"Combinaisons de câblage & applications","sec2Sub":"Trois fils de phase associés à différents nombres de neutres et de terres correspondent à différentes normes internationales, courantes selon les régions et les appareils.","wire1Title":"3 phases + 1 neutre + 1 terre","wire1Cn":"(triphasé 5 fils : 3 phases + 1 neutre + 1 terre)","wire1Code":"TN-C-S / TN-S","wire1Desc":"La norme de distribution commerciale la plus répandue au monde. Courante en Europe, en Chine et dans la majeure partie de l'Asie pour la distribution principale des immeubles de bureaux et centres commerciaux, les ascenseurs, la climatisation centrale, les grosses pompes et les bornes de recharge.","wire2Title":"3 phases + 1 terre","wire2Cn":"(triphasé 3 fils, plus une terre de protection, sans neutre)","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"Fait partie du même système de mise à la terre du bâtiment que la version 5 fils — cette dérivation ne comporte simplement pas de neutre, car les charges moteur n'ont pas besoin de monophasé 220/230V. Courant dans les ateliers et entrepôts pour entraîner moteurs industriels, gros compresseurs, convoyeurs et grandes installations de ventilation. L'équivalent nord-américain est appelé 480V Delta.","wire3Title":"3 phases + 1 neutre","wire3Cn":"(triphasé 4 fils, montage étoile)","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"Courant dans les immeubles commerciaux nord-américains. La même alimentation fournit 120V aux prises de bureau et 208V triphasé aux ascenseurs et à la climatisation — configuration standard des tours de bureaux et centres de données. Certains bâtiments commerciaux nord-américains plus anciens utilisent plutôt une variante en triangle avec un neutre tiré du point médian d'un enroulement (High-Leg Delta) — aussi 3 phases + 1 neutre, mais seules deux phases fournissent en toute sécurité 120V ; la troisième, appelée « high leg », ne doit pas être utilisée pour des charges monophasées.","wire4Title":"3 phases","wire4Cn":"(triphasé 3 fils, montage triangle, sans neutre)","wire4Code":"NEC 240V Delta","wire4Desc":"Courant dans les bâtiments commerciaux nord-américains plus anciens ou les sites légèrement industriels, dédié à l'entraînement de moteurs et autres charges de puissance pure.","glossaryHead":"Glossaire","glossaryLabel":"· ABRÉVIATIONS","g1Code":"T","g1Desc":"Terra — la source ou l'installation est directement mise à la terre","g2Code":"N","g2Desc":"Neutral — la mise à la terre est dérivée du conducteur neutre de la source","g3Code":"I","g3Desc":"Isolated — la source n'est pas mise à la terre, ou l'est via une haute impédance","g4Code":"S","g4Desc":"Separate — neutre et terre de protection restent des conducteurs séparés sur tout le parcours","g5Code":"C","g5Desc":"Combined — neutre et terre sont combinés en un seul conducteur sur une partie du parcours","g6Code":"TT","g6Desc":"La source est mise à la terre ; l'installation dispose de sa propre prise de terre, non partagée","g7Code":"TN-S","g7Desc":"La source est mise à la terre ; la terre de l'installation est dérivée du neutre, séparée sur tout le parcours","g8Code":"TN-C-S","g8Desc":"Neutre et terre combinés en amont, puis séparés dans le bâtiment (courant en Europe/Chine)","g9Code":"NEC","g9Desc":"National Electrical Code américain — l'Amérique du Nord n'utilise pas la classification TN/TT/IT","footer":"Cette page est à but pédagogique, pour expliquer les approches courantes de câblage triphasé commercial selon les régions. Pour tout câblage ou modification réels, respectez toujours les normes électriques locales et faites appel à un électricien agréé — n'ouvrez jamais vous-même un tableau électrique et ne touchez pas à un câblage inconnu."},"ru":{"title":"Руководство к игре","navBrand":"Руководство по электробезопасности","tab1":"Основы трёхфазного тока","tab2":"Схемы подключения и применение","heroEyebrow":"GAME MANUAL · ОСНОВЫ ЭЛЕКТРИКА","heroTitle":"Руководство к игре","heroSub":"Нажмите на вкладку выше, чтобы перейти к разделу, или просто прокрутите вниз.","sec1Title":"Что такое трёхфазный ток","sec1Sub":"Бытовые розетки питаются однофазным током, а торговые центры, заводы и офисные здания в основном — трёхфазным.","card1Tag":"Дома","card1Title":"Однофазный ток","card1Desc":"Один фазный провод плюс один нулевой — как дорога в одну полосу. Мощность ограничена, подходит для освещения и небольших приборов.","card2Tag":"Коммерческие / промышленные объекты","card2Title":"Трёхфазный ток","card2Desc":"Три фазных провода со сдвигом фаз — как три полосы, подающие энергию одновременно. Даёт стабильно более высокую мощность, используется для приводов двигателей, компрессоров и другого тяжёлого оборудования.","tipLabel":"Запомните:","tipText":"Трёхфазный ток не предназначен для прямого контакта с человеком. Он в основном «питает» мощное, постоянно работающее оборудование: лифты, кондиционеры, крупные насосы, промышленные двигатели.","sec2Title":"Схемы подключения и применение","sec2Sub":"Три фазных провода в сочетании с разным числом нулевых и заземляющих проводников — это разные международные стандарты, распространённые в разных регионах и для разного оборудования.","wire1Title":"3 фазы + 1 ноль + 1 земля","wire1Cn":"(пятипроводная система: 3 фазы + 1 нулевой + 1 заземляющий)","wire1Code":"TN-C-S / TN-S","wire1Desc":"Самый распространённый в мире стандарт коммерческого электроснабжения. Применяется в Европе, Китае и большей части Азии для главного щита офисных зданий и торговых центров, лифтов, центральных систем кондиционирования, крупных насосов и зарядных станций.","wire2Title":"3 фазы + 1 земля","wire2Cn":"(трёхпроводная система, плюс отдельный защитный проводник, без нуля)","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"Часть той же системы заземления здания, что и пятипроводная схема — просто в этой ветке нет нуля, так как двигателям не нужно однофазное 220/230В. Распространено в цехах и на складах для привода промышленных двигателей, крупных компрессоров, конвейеров и вентиляционных систем. В Северной Америке аналог называется 480V Delta.","wire3Title":"3 фазы + 1 ноль","wire3Cn":"(четырёхпроводная система, схема «звезда»)","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"Распространена в коммерческих зданиях Северной Америки. Один и тот же ввод подаёт 120В на розетки офиса и 208В трёхфазного тока на лифты и кондиционеры — стандарт для офисных башен и дата-центров. В некоторых старых коммерческих зданиях Северной Америки вместо этого используют вариант «треугольник» с нулём, отведённым от середины одной обмотки (High-Leg Delta) — тоже 3 фазы + 1 ноль, но безопасно получить 120В можно только от двух фаз; третья, называемая «high leg», не должна использоваться для однофазных нагрузок.","wire4Title":"3 фазы","wire4Cn":"(трёхпроводная система, схема «треугольник», без нуля)","wire4Code":"NEC 240V Delta","wire4Desc":"Распространена в старых коммерческих зданиях Северной Америки или на лёгких промышленных объектах, предназначена исключительно для привода двигателей и другой чисто силовой нагрузки.","glossaryHead":"Глоссарий","glossaryLabel":"· СОКРАЩЕНИЯ","g1Code":"T","g1Desc":"Terra — источник или установка заземлены напрямую","g2Code":"N","g2Desc":"Neutral — заземление берётся от нулевого проводника источника","g3Code":"I","g3Desc":"Isolated — источник не заземлён или заземлён через высокое сопротивление","g4Code":"S","g4Desc":"Separate — нулевой и защитный проводники идут раздельно на всём протяжении","g5Code":"C","g5Desc":"Combined — нулевой и защитный проводники объединены на части маршрута","g6Code":"TT","g6Desc":"Источник заземлён; у установки собственное отдельное заземление, не общее","g7Code":"TN-S","g7Desc":"Источник заземлён; заземление установки берётся от нуля, разделены на всём протяжении","g8Code":"TN-C-S","g8Desc":"Ноль и земля объединены до ввода в здание, затем разделяются (распространено в Европе/Китае)","g9Code":"NEC","g9Desc":"Национальный электротехнический кодекс США — в Северной Америке не используют классификацию TN/TT/IT","footer":"Эта страница носит ознакомительный характер и объясняет распространённые схемы коммерческого трёхфазного подключения в разных регионах. При реальных работах всегда следуйте местным нормам и привлекайте лицензированного электрика — не открывайте щит и не трогайте незнакомую проводку самостоятельно."},"ja":{"title":"ゲームガイド","navBrand":"電気安全マニュアル","tab1":"三相電力の基礎","tab2":"配線と用途","heroEyebrow":"GAME MANUAL · 電気工事の基礎","heroTitle":"ゲームガイド","heroSub":"上のタブをタップすると該当セクションに移動します。そのまま下にスクロールしても読めます。","sec1Title":"三相電力とは","sec1Sub":"家庭のコンセントは単相電力ですが、モール・工場・オフィスビルの多くは三相電力で動いています。","card1Tag":"家庭でよく見る","card1Title":"単相電力","card1Desc":"ライブ線1本とニュートラル線1本のみ。片側1車線の道路のようなもので、電力には限りがあり、照明や小型家電向けです。","card2Tag":"商業・産業でよく見る","card2Title":"三相電力","card2Desc":"位相がずれた3本のライブ線で構成され、3車線が同時に電力を供給するイメージです。安定した大電力を供給でき、モーターやコンプレッサーなど大出力の機器を動かすのに使われます。","tipLabel":"覚えておきたいこと：","tipText":"三相電力はそもそも人が直接触れるためのものではありません。エレベーター、空調機、大型ポンプ、産業用モーターなど、大電力かつ連続稼働する機器に電力を「供給」するためのものです。","sec2Title":"配線の組み合わせと用途","sec2Sub":"同じ「3本のライブ線」でも、ニュートラル線とアース線の本数の組み合わせによって国際規格が異なり、使われる地域や機器も変わります。","wire1Title":"ライブ3本＋ニュートラル1本＋アース1本","wire1Cn":"（三相5線式：ライブ3本＋ニュートラル1本＋アース1本）","wire1Code":"TN-C-S / TN-S","wire1Desc":"世界で最も広く使われている商業用配電規格。ヨーロッパ、中国、アジアの大部分でオフィスビルやモールの主配電、エレベーター、セントラル空調、大型ポンプ、EV充電設備などに使われます。","wire2Title":"ライブ3本＋アース1本","wire2Cn":"（三相3線式、保護用アース線を追加、ニュートラル線なし）","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"5線式と同じ建物の接地システムの一部で、モーター負荷は単相220/230Vを必要としないため、この系統だけニュートラル線を引いていません。工場や倉庫の動力配電でよく見られ、産業用モーター、大型コンプレッサー、コンベア、大型換気設備を駆動します。北米では480Vデルタと呼ばれる方式が対応します。","wire3Title":"ライブ3本＋ニュートラル1本","wire3Cn":"（三相4線式、スター（Y）結線）","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"北米の都市部の商業ビルでよく見られる配線です。同じ引込み線からオフィスのコンセント用に120V、エレベーターや空調用に三相208Vを供給し、オフィスビルやデータセンターの標準構成です。北米の一部の古い商業ビルでは、一つの巻線の中点からニュートラル線を引き出した三角結線の変形（ハイレッグ・デルタ）が使われることがあります。これもライブ3本＋ニュートラル1本ですが、120Vを安全に取り出せるのは2相だけで、「ハイレッグ」と呼ばれる3相目は単相負荷には使えません。","wire4Title":"ライブ3本","wire4Cn":"（三相3線式、デルタ結線、ニュートラル線なし）","wire4Code":"NEC 240V Delta","wire4Desc":"北米の古い商業ビルや軽工業の現場でよく見られ、モーターなど純粋な動力負荷を駆動する専用配線です。","glossaryHead":"用語集","glossaryLabel":"· 略語","g1Code":"T","g1Desc":"Terra－電源または設備を直接接地する","g2Code":"N","g2Desc":"Neutral－電源のニュートラル線から接地を取る","g3Code":"I","g3Desc":"Isolated－電源を接地しない、または高インピーダンスを介して接地する","g4Code":"S","g4Desc":"Separate－ニュートラル線とアース線を全区間にわたって分離して敷設する","g5Code":"C","g5Desc":"Combined－区間の一部でニュートラル線とアース線を1本にまとめる","g6Code":"TT","g6Desc":"電源側は接地されているが、設備側は独自の接地極を持ち、共有しない","g7Code":"TN-S","g7Desc":"電源側は接地されており、設備の接地はニュートラル線から取り、全区間分離されている","g8Code":"TN-C-S","g8Desc":"上流側でニュートラル線とアース線を1本にまとめ、建物内で分離する（ヨーロッパ・中国で一般的）","g9Code":"NEC","g9Desc":"米国電気工事規程－北米ではTN/TT/ITという分類は使われない","footer":"このページは、地域ごとの一般的な商業用三相配線の考え方を説明するための解説用です。実際の配線や改造は必ず現地の電気規格に従い、有資格の電気工事士に依頼してください。分電盤を自分で開けたり、正体不明の配線に触れたりしないでください。"},"pt-BR":{"title":"Guia do Jogo","navBrand":"Manual de Segurança Elétrica","tab1":"Fundamentos do Trifásico","tab2":"Ligações e Aplicações","heroEyebrow":"GAME MANUAL · NOÇÕES DE ELETRICISTA","heroTitle":"Guia do Jogo","heroSub":"Toque em uma aba acima para ir direto à seção, ou role a página para baixo.","sec1Title":"O Que É Energia Trifásica","sec1Sub":"As tomadas residenciais usam energia monofásica, enquanto shoppings, fábricas e prédios comerciais geralmente usam energia trifásica.","card1Tag":"Residencial","card1Title":"Energia Monofásica","card1Desc":"Um fio fase mais um neutro — como uma estrada de uma única pista. Potência limitada, ideal para iluminação e aparelhos pequenos.","card2Tag":"Comercial / Industrial","card2Title":"Energia Trifásica","card2Desc":"Três fios fase defasados entre si — como três pistas alimentando ao mesmo tempo. Fornece potência maior e estável, usada para acionar motores, compressores e outros equipamentos de grande porte.","tipLabel":"Lembre-se:","tipText":"A energia trifásica não é feita para contato direto de pessoas. Ela serve principalmente para “alimentar” equipamentos de alta potência e funcionamento contínuo, como elevadores, ar-condicionado central, bombas grandes e motores industriais.","sec2Title":"Combinações de Fiação e Aplicações","sec2Sub":"Os mesmos “três fios fase” combinados com diferentes quantidades de neutro e terra formam padrões internacionais diferentes, comuns em regiões e equipamentos distintos.","wire1Title":"3 Fases + 1 Neutro + 1 Terra","wire1Cn":"(sistema trifásico de 5 fios: 3 fases + 1 neutro + 1 terra)","wire1Code":"TN-C-S / TN-S","wire1Desc":"O padrão de distribuição comercial mais usado no mundo. Comum na Europa, China e na maior parte da Ásia para o quadro geral de prédios comerciais e shoppings, elevadores, ar-condicionado central, bombas grandes e carregadores de veículos elétricos.","wire2Title":"3 Fases + 1 Terra","wire2Cn":"(sistema trifásico de 3 fios, mais um terra de proteção separado, sem neutro)","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"Faz parte do mesmo sistema de aterramento do prédio que o sistema de 5 fios — esse ramal simplesmente não leva neutro, já que cargas de motor não precisam de monofásico 220/230V. Comum em galpões de fábricas e depósitos, acionando motores industriais, compressores grandes, esteiras transportadoras e equipamentos grandes de ventilação. O equivalente norte-americano é chamado de 480V Delta.","wire3Title":"3 Fases + 1 Neutro","wire3Cn":"(sistema trifásico de 4 fios, ligação estrela)","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"Comum em prédios comerciais urbanos norte-americanos. A mesma alimentação fornece 120V para tomadas de escritório e 208V trifásico para elevadores e equipamentos de ar-condicionado — configuração padrão em torres comerciais e data centers. Alguns prédios comerciais mais antigos da América do Norte usam uma variante em triângulo com um neutro derivado do ponto médio de um enrolamento (High-Leg Delta) — também 3 fases + 1 neutro, mas apenas duas fases fornecem 120V com segurança; a terceira, chamada de “perna alta” (high leg), não pode ser usada para cargas monofásicas.","wire4Title":"3 Fases","wire4Cn":"(sistema trifásico de 3 fios, ligação triângulo, sem neutro)","wire4Code":"NEC 240V Delta","wire4Desc":"Comum em prédios comerciais mais antigos ou locais industriais leves da América do Norte, dedicado a acionar motores e outras cargas puramente de potência.","glossaryHead":"Glossário","glossaryLabel":"· ABREVIAÇÕES","g1Code":"T","g1Desc":"Terra — a fonte ou a instalação é aterrada diretamente","g2Code":"N","g2Desc":"Neutral — o aterramento é derivado do condutor neutro da fonte","g3Code":"I","g3Desc":"Isolated — a fonte não é aterrada, ou é aterrada por alta impedância","g4Code":"S","g4Desc":"Separate — neutro e terra de proteção seguem como condutores separados em todo o percurso","g5Code":"C","g5Desc":"Combined — neutro e terra são combinados em um único condutor em parte do percurso","g6Code":"TT","g6Desc":"A fonte é aterrada; a instalação tem seu próprio eletrodo de terra, não compartilhado","g7Code":"TN-S","g7Desc":"A fonte é aterrada; o aterramento da instalação vem do neutro, mantido separado em todo o percurso","g8Code":"TN-C-S","g8Desc":"Neutro e terra combinados a montante, depois separados dentro do prédio (comum na Europa/China)","g9Code":"NEC","g9Desc":"Código Elétrico Nacional dos EUA — a América do Norte não usa a classificação TN/TT/IT","footer":"Esta página tem fins educativos, para ajudar a explicar as abordagens comuns de fiação trifásica comercial em diferentes regiões. Para fiação ou modificações reais, sempre siga as normas elétricas locais e contrate um eletricista licenciado — nunca abra um quadro elétrico ou toque em fiação desconhecida por conta própria."},"es-LA":{"title":"Guía del Juego","navBrand":"Manual de Seguridad Eléctrica","tab1":"Fundamentos del Trifásico","tab2":"Conexiones y Aplicaciones","heroEyebrow":"GAME MANUAL · NOCIONES DE ELECTRICISTA","heroTitle":"Guía del Juego","heroSub":"Toca una pestaña arriba para ir a una sección, o simplemente desplázate hacia abajo.","sec1Title":"Qué Es la Energía Trifásica","sec1Sub":"Los enchufes domésticos funcionan con corriente monofásica, mientras que centros comerciales, fábricas y edificios de oficinas suelen usar corriente trifásica.","card1Tag":"En el hogar","card1Title":"Corriente Monofásica","card1Desc":"Un cable de fase más un neutro — como una carretera de un solo carril. Potencia limitada, apta para iluminación y aparatos pequeños.","card2Tag":"Comercial / Industrial","card2Title":"Corriente Trifásica","card2Desc":"Tres cables de fase desfasados entre sí — como tres carriles suministrando energía al mismo tiempo. Entrega potencia mayor y estable, usada para accionar motores, compresores y otros equipos de gran carga.","tipLabel":"Recuerda:","tipText":"La corriente trifásica no está pensada para el contacto directo de las personas. Principalmente “alimenta” equipos de alta potencia y funcionamiento continuo, como ascensores, aire acondicionado central, bombas grandes y motores industriales.","sec2Title":"Combinaciones de Cableado y Aplicaciones","sec2Sub":"Los mismos “tres cables de fase” combinados con distinto número de neutros y tierras dan lugar a normas internacionales diferentes, comunes en distintas regiones y equipos.","wire1Title":"3 Fases + 1 Neutro + 1 Tierra","wire1Cn":"(sistema trifásico de 5 hilos: 3 fases + 1 neutro + 1 tierra)","wire1Code":"TN-C-S / TN-S","wire1Desc":"El estándar de distribución comercial más usado en el mundo. Común en Europa, China y la mayor parte de Asia para el tablero principal de edificios de oficinas y centros comerciales, ascensores, aire acondicionado central, bombas grandes y cargadores de vehículos eléctricos.","wire2Title":"3 Fases + 1 Tierra","wire2Cn":"(sistema trifásico de 3 hilos, más una tierra de protección aparte, sin neutro)","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"Forma parte del mismo sistema de puesta a tierra del edificio que el de 5 hilos — este ramal simplemente no lleva neutro, porque las cargas de motor no necesitan monofásico 220/230V. Común en naves industriales y bodegas para accionar motores industriales, compresores grandes, cintas transportadoras y equipos grandes de ventilación. El equivalente norteamericano se llama 480V Delta.","wire3Title":"3 Fases + 1 Neutro","wire3Cn":"(sistema trifásico de 4 hilos, conexión en estrella)","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"Común en edificios comerciales urbanos de Norteamérica. La misma acometida suministra 120V a los enchufes de oficina y 208V trifásicos a ascensores y equipos de aire acondicionado — configuración estándar en torres de oficinas y centros de datos. Algunos edificios comerciales más antiguos de Norteamérica usan en cambio una variante en triángulo con un neutro derivado del punto medio de un devanado (High-Leg Delta) — también 3 fases + 1 neutro, pero solo dos fases entregan 120V de forma segura; la tercera, llamada “pata alta” (high leg), no debe usarse para cargas monofásicas.","wire4Title":"3 Fases","wire4Cn":"(sistema trifásico de 3 hilos, conexión en triángulo, sin neutro)","wire4Code":"NEC 240V Delta","wire4Desc":"Común en edificios comerciales más antiguos o sitios de industria ligera en Norteamérica, dedicado exclusivamente a accionar motores y otras cargas puramente de potencia.","glossaryHead":"Glosario","glossaryLabel":"· ABREVIATURAS","g1Code":"T","g1Desc":"Terra — la fuente o la instalación está puesta a tierra directamente","g2Code":"N","g2Desc":"Neutral — la puesta a tierra se deriva del conductor neutro de la fuente","g3Code":"I","g3Desc":"Isolated — la fuente no está puesta a tierra, o lo está a través de alta impedancia","g4Code":"S","g4Desc":"Separate — el neutro y la tierra de protección van como conductores separados en todo el recorrido","g5Code":"C","g5Desc":"Combined — el neutro y la tierra se combinan en un solo conductor en parte del recorrido","g6Code":"TT","g6Desc":"La fuente está puesta a tierra; la instalación tiene su propio electrodo de tierra, no compartido","g7Code":"TN-S","g7Desc":"La fuente está puesta a tierra; la tierra de la instalación se deriva del neutro, separados en todo el recorrido","g8Code":"TN-C-S","g8Desc":"Neutro y tierra combinados antes de entrar al edificio, luego separados dentro (común en Europa/China)","g9Code":"NEC","g9Desc":"Código Eléctrico Nacional de EE. UU. — Norteamérica no usa la clasificación TN/TT/IT","footer":"Esta página tiene fines educativos, para ayudar a explicar los enfoques comunes de cableado trifásico comercial en distintas regiones. Para cableados o modificaciones reales, sigue siempre las normas eléctricas locales y contrata a un electricista certificado — nunca abras un tablero ni toques cableado desconocido por tu cuenta."},"ko":{"title":"게임 가이드","navBrand":"전기 안전 매뉴얼","tab1":"삼상 전력 기초","tab2":"배선 구성과 적용","heroEyebrow":"GAME MANUAL · 전기 작업 입문","heroTitle":"게임 가이드","heroSub":"위의 탭을 눌러 해당 섹션으로 이동하거나, 아래로 스크롤해서 읽으세요.","sec1Title":"삼상 전력이란","sec1Sub":"가정용 콘센트는 단상 전력을 쓰지만, 쇼핑몰·공장·오피스 빌딩은 대부분 삼상 전력을 사용합니다.","card1Tag":"가정에서 흔함","card1Title":"단상 전력","card1Desc":"상선 1개와 중성선 1개뿐입니다. 1차선 도로와 같아서 전력이 제한적이며, 조명이나 소형 가전에 적합합니다.","card2Tag":"상업/산업 시설에서 흔함","card2Title":"삼상 전력","card2Desc":"위상이 어긋난 3개의 상선으로 구성되며, 3차선 도로가 동시에 전력을 공급하는 것과 같습니다. 안정적으로 더 큰 전력을 공급할 수 있어 모터, 압축기 같은 대용량 장비를 구동하는 데 쓰입니다.","tipLabel":"기억하세요:","tipText":"삼상 전력은 사람이 직접 만지도록 만들어진 것이 아닙니다. 엘리베이터, 중앙 냉난방 장치, 대형 펌프, 산업용 모터처럼 대용량으로 계속 가동되는 설비에 전력을 “공급”하는 것이 주된 목적입니다.","sec2Title":"배선 조합과 적용 범위","sec2Sub":"같은 “세 가닥의 상선”이라도 중성선과 접지선의 수를 어떻게 조합하느냐에 따라 국제 표준이 달라지고, 적용되는 지역과 설비도 달라집니다.","wire1Title":"상선 3 + 중성선 1 + 접지선 1","wire1Cn":"（삼상 5선식: 상선 3 + 중성선 1 + 접지선 1）","wire1Code":"TN-C-S / TN-S","wire1Desc":"전 세계적으로 가장 널리 쓰이는 상업용 배전 표준입니다. 유럽, 중국, 아시아 대부분 지역의 오피스 빌딩·쇼핑몰 총배전, 엘리베이터, 중앙 냉난방 장치, 대형 펌프, 충전소 등에 널리 쓰입니다.","wire2Title":"상선 3 + 접지선 1","wire2Cn":"（삼상 3선식, 보호용 접지선 추가, 중성선 없음）","wire2Code":"TN-C-S / TN-S / TT","wire2Desc":"5선식과 같은 건물 접지 시스템의 일부이며, 모터 부하는 단상 220/230V가 필요 없기 때문에 이 회로만 중성선을 연결하지 않은 것뿐입니다. 공장이나 창고의 동력 배전에서 흔히 볼 수 있으며, 산업용 모터, 대형 압축기, 컨베이어, 대형 환기 설비를 구동합니다. 북미에서는 480V 델타(Delta) 방식이 이에 해당합니다.","wire3Title":"상선 3 + 중성선 1","wire3Cn":"（삼상 4선식, 스타(Y) 결선）","wire3Code":"NEC 208Y/120V Wye","wire3Desc":"북미 도심 상업용 건물에서 흔히 볼 수 있는 배선입니다. 같은 인입선에서 사무실 콘센트용 120V와 엘리베이터·냉난방 장치용 삼상 208V를 동시에 공급하며, 오피스 타워와 데이터센터의 표준 구성입니다. 일부 오래된 북미 상업용 건물에서는 한 권선의 중간점에서 중성선을 인출한 삼각 결선 변형(High-Leg Delta)을 쓰기도 하는데, 이 역시 상선 3 + 중성선 1이지만 두 상에서만 안전하게 120V를 뽑을 수 있고, “하이 레그(high leg)”라 불리는 세 번째 상은 단상 부하에 쓸 수 없습니다.","wire4Title":"상선 3","wire4Cn":"（삼상 3선식, 델타(삼각) 결선, 중성선 없음）","wire4Code":"NEC 240V Delta","wire4Desc":"북미의 오래된 상업용 건물이나 경공업 현장에서 흔히 볼 수 있으며, 모터 등 순수 동력 부하만을 구동하는 전용 배선입니다.","glossaryHead":"용어 정리","glossaryLabel":"· 약어","g1Code":"T","g1Desc":"Terra－전원이나 설비를 직접 접지","g2Code":"N","g2Desc":"Neutral－전원의 중성선을 이용해 접지","g3Code":"I","g3Desc":"Isolated－전원을 접지하지 않거나 고임피던스를 통해 접지","g4Code":"S","g4Desc":"Separate－중성선과 접지선을 전 구간 분리해서 배선","g5Code":"C","g5Desc":"Combined－중성선과 접지선을 일부 구간에서 한 가닥으로 합침","g6Code":"TT","g6Desc":"전원 측은 접지되어 있고, 설비 측은 별도의 자체 접지극을 사용하며 서로 공유하지 않음","g7Code":"TN-S","g7Desc":"전원 측이 접지되어 있고, 설비의 접지는 중성선에서 가져오되 전 구간 분리해서 배선","g8Code":"TN-C-S","g8Desc":"인입 구간에서는 중성선과 접지선을 합치고, 건물 내부에서 다시 분리（유럽·중국에서 흔함）","g9Code":"NEC","g9Desc":"미국 국가전기규격－북미에서는 TN/TT/IT 분류를 쓰지 않음","footer":"이 페이지는 지역별로 흔히 쓰이는 상업용 삼상 배선 방식을 설명하기 위한 학습용 자료입니다. 실제 배선이나 개조 작업은 반드시 현지 전기 규정을 따르고 자격을 갖춘 전기 기술자에게 맡기세요. 스스로 분전반을 열거나 정체를 알 수 없는 배선을 만지지 마세요."}};
	function guideT(lang) {
		return GUIDE_I18N[lang] || GUIDE_I18N["zh-CN"];
	}

	/* -------------------- 完整的 guide 页面内容(按当前语言动态生成) -------------------- */
	function buildGuideHTML(lang) {
		const t = guideT(lang);
		return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg-void:#121316;
    --panel:#1b1d22;
    --panel-alt:#212429;
    --line:#33363d;
    --yellow:#ffc53d;
    --yellow-dim:#7a6524;
    --live:#e8453c;
    --live-dim:#4a201d;
    --neutral:#3b8ec4;
    --neutral-dim:#1e394a;
    --ground-a:#c9d93b;
    --ground-b:#3fa34d;
    --text:#ece9e2;
    --text-muted:#9aa0a6;
    --text-faint:#666b72;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    background:var(--bg-void);
    color:var(--text);
    font-family:'Noto Sans SC',sans-serif;
    font-size:16px;
    line-height:1.7;
    -webkit-font-smoothing:antialiased;
  }
  .mono{font-family:'JetBrains Mono',monospace;}
  .disp{font-family:'Rajdhani','Noto Sans SC',sans-serif;font-weight:700;letter-spacing:0.02em;}

  .stripe{
    background:repeating-linear-gradient(135deg,var(--yellow) 0 14px, #1a1a1a 14px 28px);
    height:6px;
  }

  /* ===== TOP NAV ===== */
  nav{
    position:sticky;top:0;z-index:50;
    background:rgba(18,19,22,0.92);
    backdrop-filter:blur(8px);
    border-bottom:1px solid var(--line);
  }
  .nav-inner{
    max-width:960px;margin:0 auto;
    display:flex;align-items:center;gap:4px;
    padding:0 20px;
    overflow-x:auto;
  }
  .nav-brand{
    font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;
    color:var(--yellow);letter-spacing:0.08em;
    padding-right:18px;margin-right:4px;border-right:1px solid var(--line);
    white-space:nowrap;
  }
  .tab{
    appearance:none;background:none;border:none;cursor:pointer;
    color:var(--text-muted);
    font-family:'Noto Sans SC',sans-serif;font-weight:700;font-size:15px;
    padding:16px 14px;position:relative;
    display:flex;align-items:center;gap:8px;
    transition:color .2s;white-space:nowrap;
  }
  .tab .num{font-family:'Rajdhani',sans-serif;font-size:12px;color:var(--text-faint);}
  .tab:hover{color:var(--text);}
  .tab.active{color:var(--yellow);}
  .tab.active .num{color:var(--yellow);}
  .tab::after{
    content:"";position:absolute;left:14px;right:14px;bottom:0;height:2px;
    background:var(--yellow);transform:scaleX(0);transform-origin:left;
    transition:transform .25s;
  }
  .tab.active::after{transform:scaleX(1);}

  /* ===== LAYOUT ===== */
  .doc{max-width:960px;margin:0 auto;padding:0 20px 80px;position:relative;}

  /* ===== HERO ===== */
  .hero{padding:64px 0 40px;}
  .hero .eyebrow{
    color:var(--yellow);font-family:'Rajdhani',sans-serif;font-weight:700;
    font-size:13px;letter-spacing:.25em;text-transform:uppercase;margin-bottom:14px;
  }
  .hero h1{
    font-size:clamp(32px,6vw,48px);margin:0 0 14px;color:var(--text);
  }
  .hero p{color:var(--text-muted);font-size:17px;max-width:600px;margin:0;}

  /* ===== SECTION ===== */
  section{padding:56px 0;border-top:1px solid var(--line);scroll-margin-top:70px;}
  .sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:8px;}
  .sec-head .idx{font-family:'Rajdhani',sans-serif;font-size:18px;color:var(--text-faint);}
  .sec-head h2{font-size:28px;margin:0;color:var(--text);}
  .sec-sub{color:var(--text-muted);font-size:16px;margin:0 0 32px;max-width:640px;}

  /* ===== CONCEPT CARDS (section 1) ===== */
  .control-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  @media (max-width:640px){.control-grid{grid-template-columns:1fr;}}
  .ctrl-card{
    background:var(--panel);border:1px solid var(--line);border-radius:10px;
    padding:22px 20px;position:relative;overflow:hidden;
  }
  .ctrl-card.warn{border-color:var(--live-dim);}
  .ctrl-card.safe{border-color:#2a5a3a;}
  .btn-tag{
    display:inline-flex;align-items:center;gap:8px;
    font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;
    padding:4px 10px;border-radius:4px;margin-bottom:14px;letter-spacing:.05em;
  }
  .btn-tag.left{background:var(--live-dim);color:#ff9089;}
  .btn-tag.right{background:var(--neutral-dim);color:#8fc5ea;}
  .ctrl-card h3{margin:0 0 8px;font-size:21px;}
  .ctrl-card p{margin:0;color:var(--text-muted);font-size:16px;}
  .tip{
    margin-top:20px;background:var(--panel-alt);border-left:3px solid var(--yellow);
    padding:14px 16px;border-radius:0 8px 8px 0;font-size:16px;color:var(--text);
  }
  .tip b{color:var(--yellow);}

  /* ===== WIRING COMBO CARDS (section 2) ===== */
  .wire-row{
    display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:flex-start;
    padding:18px;background:var(--panel);border-radius:10px;margin-bottom:14px;border:1px solid var(--line);
  }
  .wire-chip{
    width:74px;min-height:54px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;color:#161616;
    text-align:center;line-height:1.2;padding:4px;
  }
  .wire-chip.c5{background:linear-gradient(135deg,var(--live) 0 40%, var(--neutral) 40% 70%, var(--ground-a) 70% 100%);}
  .wire-chip.c3{background:linear-gradient(135deg,var(--live) 0 60%, var(--ground-a) 60% 100%);}
  .wire-chip.c4y{background:linear-gradient(135deg,var(--live) 0 55%, var(--neutral) 55% 100%);}
  .wire-chip.c3d{background:var(--live);}
  .wire-row h3{margin:2px 0 6px;font-size:19px;}
  .wire-row h3 .cn{color:var(--text);font-weight:400;font-size:18px;margin-left:6px;}
  .wire-row p{margin:0 0 6px;color:var(--text);font-size:16px;}
  .wire-row .std-code{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--yellow);letter-spacing:.03em;margin-bottom:8px;}

  /* ===== GLOSSARY ===== */
  .glossary{
    margin-top:16px;padding:22px 24px;background:var(--panel);border:1px solid var(--line);
    border-radius:10px;
  }
  .glossary-head{
    font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px;color:var(--yellow);
    letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px;
  }
  .glossary-head .mono{color:var(--text-faint);font-weight:400;font-size:12px;letter-spacing:.15em;}
  .glossary-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;}
  @media (max-width:640px){.glossary-grid{grid-template-columns:1fr;}}
  .g-item{font-size:14px;color:var(--text-muted);line-height:1.6;}
  .g-code{
    font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--text);
    background:var(--panel-alt);border-radius:4px;padding:1px 7px;margin-right:8px;font-size:13px;
  }

  footer{
    max-width:960px;margin:0 auto;padding:40px 20px 60px;
    border-top:1px solid var(--line);color:var(--text-faint);font-size:13px;
  }
</style>
</head>
<body>

<div class="stripe"></div>
<nav>
  <div class="nav-inner">
    <span class="nav-brand">${t.navBrand}</span>
    <button class="tab" data-target="sec1"><span class="num">01</span>${t.tab1}</button>
    <button class="tab" data-target="sec2"><span class="num">02</span>${t.tab2}</button>
  </div>
</nav>

<div class="doc">

  <div class="hero">
    <div class="eyebrow">${t.heroEyebrow}</div>
    <h1>${t.heroTitle}</h1>
    <p>${t.heroSub}</p>
  </div>

  <!-- ================= SECTION 1 ================= -->
  <section id="sec1">
    <div class="sec-head"><span class="idx mono">01</span><h2>${t.sec1Title}</h2></div>
    <p class="sec-sub">${t.sec1Sub}</p>

    <div class="control-grid">
      <div class="ctrl-card safe">
        <div class="btn-tag right">${t.card1Tag}</div>
        <h3>${t.card1Title}</h3>
        <p>${t.card1Desc}</p>
      </div>
      <div class="ctrl-card warn">
        <div class="btn-tag left">${t.card2Tag}</div>
        <h3>${t.card2Title}</h3>
        <p>${t.card2Desc}</p>
      </div>
    </div>

    <div class="tip">
      <b>${t.tipLabel}</b> ${t.tipText}
    </div>
  </section>

  <!-- ================= SECTION 2 ================= -->
  <section id="sec2">
    <div class="sec-head"><span class="idx mono">02</span><h2>${t.sec2Title}</h2></div>
    <p class="sec-sub">${t.sec2Sub}</p>

    <div class="wire-row">
      <div class="wire-chip c5">3+1+1</div>
      <div>
        <h3>${t.wire1Title}<span class="cn">${t.wire1Cn}</span></h3>
        <div class="std-code">${t.wire1Code}</div>
        <p>${t.wire1Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip c3">3+1</div>
      <div>
        <h3>${t.wire2Title}<span class="cn">${t.wire2Cn}</span></h3>
        <div class="std-code">${t.wire2Code}</div>
        <p>${t.wire2Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip c4y">3+1</div>
      <div>
        <h3>${t.wire3Title}<span class="cn">${t.wire3Cn}</span></h3>
        <div class="std-code">${t.wire3Code}</div>
        <p>${t.wire3Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip c3d">3</div>
      <div>
        <h3>${t.wire4Title}<span class="cn">${t.wire4Cn}</span></h3>
        <div class="std-code">${t.wire4Code}</div>
        <p>${t.wire4Desc}</p>
      </div>
    </div>
  </section>

  <div class="glossary">
    <div class="glossary-head">${t.glossaryHead} <span class="mono">${t.glossaryLabel}</span></div>
    <div class="glossary-grid">
      <div class="g-item"><span class="g-code">${t.g1Code}</span>${t.g1Desc}</div>
      <div class="g-item"><span class="g-code">${t.g2Code}</span>${t.g2Desc}</div>
      <div class="g-item"><span class="g-code">${t.g3Code}</span>${t.g3Desc}</div>
      <div class="g-item"><span class="g-code">${t.g4Code}</span>${t.g4Desc}</div>
      <div class="g-item"><span class="g-code">${t.g5Code}</span>${t.g5Desc}</div>
    </div>
    <div class="glossary-grid" style="margin-top:10px;">
      <div class="g-item"><span class="g-code">${t.g6Code}</span>${t.g6Desc}</div>
      <div class="g-item"><span class="g-code">${t.g7Code}</span>${t.g7Desc}</div>
      <div class="g-item"><span class="g-code">${t.g8Code}</span>${t.g8Desc}</div>
      <div class="g-item"><span class="g-code">${t.g9Code}</span>${t.g9Desc}</div>
    </div>
  </div>
</div>

<footer>
  ${t.footer}
</footer>

<script>
  const tabs = document.querySelectorAll('.tab');
  const sections = [...tabs].map(t => document.getElementById(t.dataset.target));

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.getElementById(tab.dataset.target).scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        tabs.forEach(t => t.classList.remove('active'));
        const active = [...tabs].find(t => t.dataset.target === entry.target.id);
        if(active) active.classList.add('active');
      }
    });
  }, {rootMargin:'-40% 0px -55% 0px', threshold:0});

  sections.forEach(s => s && io.observe(s));
</script>

</body>
</html>
`;
	}

	/* -------------------- 帮助按钮专属样式(不含基础弹窗系统,那部分由 ensureCoreStyles 提供) -------------------- */
	function injectHelpButtonStyles() {
		if (document.getElementById("guideHelpStyles")) return;
		const style = document.createElement("style");
		style.id = "guideHelpStyles";
		style.textContent = `
			.guide-help-btn {
				position: absolute;
				top: 12px;
				right: 136px;
				width: 34px;
				height: 34px;
				z-index: 96;
				background: var(--paper, #fff);
				border: 2px solid var(--brass, #1a56c4);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-family: Georgia, "Songti SC", serif;
				font-weight: 700;
				font-size: 16px;
				line-height: 1;
				color: var(--brass, #1a56c4);
				cursor: pointer;
				box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
				transition: transform 0.15s, color 0.15s;
				user-select: none;
			}
			.guide-help-btn:hover {
				transform: scale(1.08);
				color: var(--brass-light, #4d82d6);
			}
			.guide-help-btn:active {
				transform: scale(0.94);
			}

			#guideModal.modal-bg {
				padding: 0;
				z-index: 97; /* 高于 .hp-bar / .guide-help-btn 的 96,使指南弹窗覆盖游戏UI组件；
				                其它复用 .modal-bg 的弹窗仍保持 90,不受影响 */
			}
			#guideModal .guide-modal-panel {
				position: relative;
				width: min(780px, 94vw);
				height: min(88vh, 920px);
				background: #121316;
				border: 3px solid #000;
				border-radius: 8px;
				box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6);
				overflow: hidden;
			}
			.guide-modal-close {
				position: absolute;
				top: 10px;
				right: 10px;
				z-index: 5;
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background: rgba(0, 0, 0, 0.55);
				color: #ece9e2;
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				font-size: 16px;
				border: 1px solid rgba(255, 255, 255, 0.25);
				transition: background 0.15s;
			}
			.guide-modal-close:hover {
				background: rgba(0, 0, 0, 0.8);
			}
			.guide-iframe {
				width: 100%;
				height: 100%;
				border: none;
				display: block;
				background: #121316;
			}
			@media (max-width: 640px) {
				.guide-help-btn {
					right: 122px;
					width: 30px;
					height: 30px;
					font-size: 14px;
				}
			}
		`;
		document.head.appendChild(style);
	}

	/* -------------------- 获取宿主页面当前语言(若宿主未实现 currentLang/applyLang,则回退中文) -------------------- */
	function getHostLang() {
		try {
			// eslint-disable-next-line no-undef
			if (typeof currentLang !== "undefined" && GUIDE_I18N[currentLang]) return currentLang;
		} catch (e) {}
		return "zh-CN";
	}

	/* -------------------- 创建按钮 + 弹窗 -------------------- */
	function initGuideButton() {
		const gameWindow = document.querySelector(".game-window");
		if (!gameWindow) return;
		if (document.getElementById("guideHelpBtn")) return; // 防止重复注入

		ensureCoreStyles(); // 复用 .modal-bg 的遮罩/开关样式
		injectHelpButtonStyles();

		// "?" 帮助按钮，位于验电笔(meter)左侧
		const btn = document.createElement("div");
		btn.id = "guideHelpBtn";
		btn.className = "guide-help-btn";
		btn.title = guideT(getHostLang()).title;
		btn.textContent = "?";
		gameWindow.appendChild(btn);

		// 弹窗：复用 .modal-bg 机制（含宿主页面里 ESC 关闭其它弹窗的通用逻辑）
		const modal = document.createElement("div");
		modal.id = "guideModal";
		modal.className = "modal-bg";
		modal.innerHTML =
			'<div class="guide-modal-panel">' +
			'<div class="guide-modal-close" id="guideModalClose" title="关闭">✕</div>' +
			'<iframe class="guide-iframe" id="guideIframe"></iframe>' +
			"</div>";
		document.body.appendChild(modal);

		const iframe = modal.querySelector("#guideIframe");
		const closeIcon = modal.querySelector("#guideModalClose");
		let renderedLang = null; // 记录当前 iframe 内实际渲染的语言,语言切换后重新生成

		function openGuide() {
			const lang = getHostLang();
			if (renderedLang !== lang) {
				iframe.srcdoc = buildGuideHTML(lang);
				iframe.title = guideT(lang).title;
				renderedLang = lang;
			}
			btn.title = guideT(lang).title;
			modal.classList.add("show");
		}
		function closeGuide() {
			modal.classList.remove("show");
		}

		btn.addEventListener("click", openGuide);
		closeIcon.addEventListener("click", closeGuide);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeGuide();
		});

		// 暴露到全局，方便按需调用/调试
		window.openSafetyGuide = openGuide;
		window.closeSafetyGuide = closeGuide;
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initGuideButton);
	} else {
		initGuideButton();
	}
})();
