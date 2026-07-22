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
	const GUIDE_I18N = {
  "zh-CN": {
    "title": "游戏指南",
    "navBrand": "安全用电手册",
    "tab1": "基础操作",
    "tab2": "认识三根线",
    "tab3": "漏电保护",
    "heroEyebrow": "GAME MANUAL · 电工作业入门",
    "heroTitle": "游戏指南",
    "heroSub": "点击上方标签跳转，或直接向下滚动阅读。",
    "sec1Title": "基础操作",
    "sec1Sub": "面对电线或电器，有两种操作方式。",
    "card1Tag": "鼠标左键",
    "card1Title": "伸手触摸",
    "card1Desc": "直接用手碰电线或电器。如果带电，你会被电到。",
    "card2Tag": "鼠标右键",
    "card2Title": "验电笔验电",
    "card2Desc": "绿灯不带电，黄灯带弱电，红灯带强电。",
    "tipLabel": "记住：",
    "tipText": "先右键验电，确认安全后再考虑用手接触。",
    "sec2Title": "认识零线、火线、地线",
    "sec2Sub": "一根电线里住着三兄弟，脾气各不相同。",
    "wire1Title": "火线",
    "wire1Cn": "红/黄/绿色",
    "wire1Desc": "把电\"送出去\"，一直带电，碰到就会触电。",
    "wire2Title": "零线",
    "wire2Cn": "蓝色",
    "wire2Desc": "电用完后\"流回来\"的通道，正常不带电，但也别掉以轻心。",
    "wire3Title": "地线",
    "wire3Cn": "黄绿双色",
    "wire3Desc": "平时不通电，一旦漏电，抢先把电引入大地，保护人。",
    "sec3Title": "漏电保护的原理和作用",
    "sec3Sub": "配电箱上那个小开关，其实是救命关键。",
    "diagSource": "电源",
    "diagLiveIn": "火线 进",
    "diagGuard": "漏保",
    "diagGuardSub": "比较进/出",
    "diagNeutralOut": "零线 出",
    "diagDevice": "电器",
    "diagLeak": "漏出 → 跳闸",
    "rcdP1": "正常时，进的电流和出的电流一样多。漏保一直在比较这两个数。",
    "rcdP2": "一旦有人触电，一部分电流会\"抄近路\"经过人体流走，进出对不上，漏保立刻跳闸断电。",
    "func1Title": "防止触电伤人",
    "func1Desc": "提前切断电源，减少伤害，很多时候能救命。",
    "func2Title": "预防电器起火",
    "func2Desc": "长期漏电会发热起火，漏保能提前断电预防。",
    "footer": "本手册用于游戏内说明。现实生活中请遵循专业电工规范，不要自行拆装电器或触碰不明线路。"
  },
  "zh-TW": {
    "title": "遊戲指南",
    "navBrand": "安全用電手冊",
    "tab1": "基礎操作",
    "tab2": "認識三根線",
    "tab3": "漏電保護",
    "heroEyebrow": "GAME MANUAL · 電工作業入門",
    "heroTitle": "遊戲指南",
    "heroSub": "點擊上方標籤跳轉，或直接向下滾動閱讀。",
    "sec1Title": "基礎操作",
    "sec1Sub": "面對電線或電器，有兩種操作方式。",
    "card1Tag": "滑鼠左鍵",
    "card1Title": "伸手觸摸",
    "card1Desc": "直接用手碰電線或電器。如果帶電，你會被電到。",
    "card2Tag": "滑鼠右鍵",
    "card2Title": "驗電筆驗電",
    "card2Desc": "綠燈不帶電，黃燈帶弱電，紅燈帶強電。",
    "tipLabel": "記住：",
    "tipText": "先右鍵驗電，確認安全後再考慮用手接觸。",
    "sec2Title": "認識零線、火線、地線",
    "sec2Sub": "一根電線裡住著三兄弟，脾氣各不相同。",
    "wire1Title": "火線",
    "wire1Cn": "紅/黃/綠色",
    "wire1Desc": "把電\"送出去\"，一直帶電，碰到就會觸電。",
    "wire2Title": "零線",
    "wire2Cn": "藍色",
    "wire2Desc": "電用完後\"流回來\"的通道，正常不帶電，但也別掉以輕心。",
    "wire3Title": "地線",
    "wire3Cn": "黃綠雙色",
    "wire3Desc": "平時不通電，一旦漏電，搶先把電引入大地，保護人。",
    "sec3Title": "漏電保護的原理和作用",
    "sec3Sub": "配電箱上那個小開關，其實是救命關鍵。",
    "diagSource": "電源",
    "diagLiveIn": "火線 進",
    "diagGuard": "漏保",
    "diagGuardSub": "比較進/出",
    "diagNeutralOut": "零線 出",
    "diagDevice": "電器",
    "diagLeak": "漏出 → 跳閘",
    "rcdP1": "正常時，進的電流和出的電流一樣多。漏保一直在比較這兩個數。",
    "rcdP2": "一旦有人觸電，一部分電流會\"抄近路\"經過人體流走，進出對不上，漏保立刻跳閘斷電。",
    "func1Title": "防止觸電傷人",
    "func1Desc": "提前切斷電源，減少傷害，很多時候能救命。",
    "func2Title": "預防電器起火",
    "func2Desc": "長期漏電會發熱起火，漏保能提前斷電預防。",
    "footer": "本手冊用於遊戲內說明。現實生活中請遵循專業電工規範，不要自行拆裝電器或觸碰不明線路。"
  },
  "en": {
    "title": "Game Guide",
    "navBrand": "Electrical Safety Manual",
    "tab1": "Basic Controls",
    "tab2": "The Three Wires",
    "tab3": "Leakage Protection",
    "heroEyebrow": "GAME MANUAL · Electrician Basics",
    "heroTitle": "Game Guide",
    "heroSub": "Click a tab above to jump, or scroll down to read.",
    "sec1Title": "Basic Controls",
    "sec1Sub": "There are two ways to interact with wires or appliances.",
    "card1Tag": "Left Click",
    "card1Title": "Touch by Hand",
    "card1Desc": "Touch the wire or appliance directly. If it's live, you'll get shocked.",
    "card2Tag": "Right Click",
    "card2Title": "Test with the Voltage Pen",
    "card2Desc": "Green means no power, yellow means low voltage, red means high voltage.",
    "tipLabel": "Remember:",
    "tipText": "Right-click to test first. Only touch by hand once it's confirmed safe.",
    "sec2Title": "Live, Neutral & Ground Wires",
    "sec2Sub": "Three \"brothers\" live inside one cable, each with a different temperament.",
    "wire1Title": "Live Wire",
    "wire1Cn": "Red / Yellow / Green",
    "wire1Desc": "Sends power \"out.\" Always live — touching it will shock you.",
    "wire2Title": "Neutral Wire",
    "wire2Cn": "Blue",
    "wire2Desc": "The return path once power is used. Normally not live, but never let your guard down.",
    "wire3Title": "Ground Wire",
    "wire3Cn": "Yellow-Green Striped",
    "wire3Desc": "Carries no current normally. The moment there's a leak, it redirects power into the earth to protect you.",
    "sec3Title": "How Leakage Protection Works",
    "sec3Sub": "That small switch in the panel box is actually a lifesaver.",
    "diagSource": "Power",
    "diagLiveIn": "Live In",
    "diagGuard": "RCD",
    "diagGuardSub": "Compares In/Out",
    "diagNeutralOut": "Neutral Out",
    "diagDevice": "Appliance",
    "diagLeak": "Leak → Trip",
    "rcdP1": "Normally, the current going in equals the current coming out. The RCD constantly compares these two numbers.",
    "rcdP2": "The moment someone gets shocked, some current takes a \"shortcut\" through their body. In and out no longer match, and the RCD trips instantly, cutting power.",
    "func1Title": "Prevents Electric Shock",
    "func1Desc": "Cuts power in advance to reduce harm — often life-saving.",
    "func2Title": "Prevents Electrical Fires",
    "func2Desc": "Long-term leakage causes heat and fire; the RCD can cut power before that happens.",
    "footer": "This manual is for in-game reference only. In real life, follow professional electrical codes — don't disassemble appliances or touch unknown wiring yourself."
  },
  "de": {
    "title": "Spielanleitung",
    "navBrand": "Handbuch für elektrische Sicherheit",
    "tab1": "Grundsteuerung",
    "tab2": "Die drei Adern",
    "tab3": "Fehlerstromschutz",
    "heroEyebrow": "GAME MANUAL · Elektriker-Grundlagen",
    "heroTitle": "Spielanleitung",
    "heroSub": "Klicke oben auf einen Tab oder scrolle einfach nach unten.",
    "sec1Title": "Grundsteuerung",
    "sec1Sub": "Es gibt zwei Möglichkeiten, mit Kabeln oder Geräten zu interagieren.",
    "card1Tag": "Linksklick",
    "card1Title": "Mit der Hand berühren",
    "card1Desc": "Berühre das Kabel oder Gerät direkt. Steht es unter Spannung, bekommst du einen Schlag.",
    "card2Tag": "Rechtsklick",
    "card2Title": "Mit dem Spannungsprüfer testen",
    "card2Desc": "Grün bedeutet spannungsfrei, Gelb niedrige Spannung, Rot hohe Spannung.",
    "tipLabel": "Merke dir:",
    "tipText": "Erst mit Rechtsklick prüfen. Erst wenn es sicher ist, mit der Hand berühren.",
    "sec2Title": "Phase, Neutralleiter & Erdung",
    "sec2Sub": "Drei \"Brüder\" leben in einem Kabel, jeder mit einem anderen Temperament.",
    "wire1Title": "Phase (Außenleiter)",
    "wire1Cn": "Rot/Gelb/Grün",
    "wire1Desc": "Führt den Strom \"hinaus\". Immer unter Spannung — Berühren führt zum Stromschlag.",
    "wire2Title": "Neutralleiter",
    "wire2Cn": "Blau",
    "wire2Desc": "Der Rückweg des Stroms nach dem Verbrauch. Normalerweise spannungsfrei, aber trotzdem Vorsicht geboten.",
    "wire3Title": "Schutzleiter (Erdung)",
    "wire3Cn": "Gelb-Grün gestreift",
    "wire3Desc": "Normalerweise stromlos. Bei einem Fehlerstrom leitet er den Strom sofort in die Erde ab, um dich zu schützen.",
    "sec3Title": "Wie der Fehlerstromschutz funktioniert",
    "sec3Sub": "Der kleine Schalter im Sicherungskasten ist tatsächlich ein Lebensretter.",
    "diagSource": "Stromquelle",
    "diagLiveIn": "Phase rein",
    "diagGuard": "FI-Schalter",
    "diagGuardSub": "Vergleicht Ein/Aus",
    "diagNeutralOut": "Neutral raus",
    "diagDevice": "Gerät",
    "diagLeak": "Fehlerstrom → Auslösung",
    "rcdP1": "Normalerweise ist der eingehende Strom genauso groß wie der ausgehende. Der FI-Schalter vergleicht diese beiden Werte ständig.",
    "rcdP2": "Sobald jemand einen Stromschlag bekommt, nimmt ein Teil des Stroms eine \"Abkürzung\" durch den Körper. Ein und Aus stimmen nicht mehr überein, und der FI-Schalter löst sofort aus.",
    "func1Title": "Verhindert Stromschläge",
    "func1Desc": "Schaltet den Strom vorzeitig ab, um Schäden zu reduzieren — oft lebensrettend.",
    "func2Title": "Verhindert Elektrobrände",
    "func2Desc": "Anhaltender Fehlerstrom erzeugt Wärme und kann Brände verursachen; der FI-Schalter schaltet vorher ab.",
    "footer": "Dieses Handbuch dient nur als Erklärung im Spiel. Befolge im echten Leben die professionellen Elektrovorschriften — zerlege keine Geräte und berühre keine unbekannten Leitungen selbst."
  },
  "fr": {
    "title": "Guide du jeu",
    "navBrand": "Manuel de sécurité électrique",
    "tab1": "Contrôles de base",
    "tab2": "Les trois fils",
    "tab3": "Protection différentielle",
    "heroEyebrow": "GAME MANUAL · Bases d'électricien",
    "heroTitle": "Guide du jeu",
    "heroSub": "Cliquez sur un onglet ci-dessus ou faites défiler vers le bas.",
    "sec1Title": "Contrôles de base",
    "sec1Sub": "Il y a deux façons d'interagir avec un fil ou un appareil.",
    "card1Tag": "Clic gauche",
    "card1Title": "Toucher à la main",
    "card1Desc": "Touchez directement le fil ou l'appareil. S'il est sous tension, vous serez électrocuté.",
    "card2Tag": "Clic droit",
    "card2Title": "Tester avec le stylo testeur",
    "card2Desc": "Vert signifie pas de tension, jaune tension faible, rouge tension élevée.",
    "tipLabel": "Retenez :",
    "tipText": "Testez d'abord avec le clic droit. Ne touchez à la main qu'une fois la sécurité confirmée.",
    "sec2Title": "Phase, neutre et terre",
    "sec2Sub": "Trois \"frères\" vivent dans un même câble, chacun avec un tempérament différent.",
    "wire1Title": "Phase",
    "wire1Cn": "Rouge/Jaune/Vert",
    "wire1Desc": "Envoie le courant \"vers l'extérieur\". Toujours sous tension — la toucher provoque une électrocution.",
    "wire2Title": "Neutre",
    "wire2Cn": "Bleu",
    "wire2Desc": "Le chemin de retour du courant après utilisation. Normalement sans tension, mais restez prudent.",
    "wire3Title": "Terre",
    "wire3Cn": "Jaune-vert rayé",
    "wire3Desc": "Normalement sans courant. Dès qu'il y a une fuite, elle dirige le courant vers la terre pour vous protéger.",
    "sec3Title": "Comment fonctionne la protection différentielle",
    "sec3Sub": "Ce petit interrupteur dans le tableau électrique est en fait un sauveur.",
    "diagSource": "Alimentation",
    "diagLiveIn": "Phase entrante",
    "diagGuard": "DDR",
    "diagGuardSub": "Compare entrée/sortie",
    "diagNeutralOut": "Neutre sortant",
    "diagDevice": "Appareil",
    "diagLeak": "Fuite → Déclenchement",
    "rcdP1": "Normalement, le courant entrant est égal au courant sortant. Le disjoncteur différentiel compare constamment ces deux valeurs.",
    "rcdP2": "Dès qu'une personne est électrocutée, une partie du courant emprunte un \"raccourci\" à travers le corps. L'entrée et la sortie ne correspondent plus, et le disjoncteur se déclenche instantanément.",
    "func1Title": "Empêche les électrocutions",
    "func1Desc": "Coupe le courant à l'avance pour réduire les dommages — souvent salvateur.",
    "func2Title": "Prévient les incendies électriques",
    "func2Desc": "Une fuite prolongée génère de la chaleur et peut provoquer un incendie ; le disjoncteur coupe le courant avant que cela n'arrive.",
    "footer": "Ce manuel sert uniquement de référence dans le jeu. Dans la vraie vie, suivez les normes électriques professionnelles — ne démontez pas d'appareils et ne touchez pas de câbles inconnus vous-même."
  },
  "ru": {
    "title": "Руководство по игре",
    "navBrand": "Пособие по электробезопасности",
    "tab1": "Основные действия",
    "tab2": "Три провода",
    "tab3": "Защита от утечки",
    "heroEyebrow": "GAME MANUAL · Основы электрика",
    "heroTitle": "Руководство по игре",
    "heroSub": "Нажмите на вкладку выше или прокрутите вниз.",
    "sec1Title": "Основные действия",
    "sec1Sub": "Есть два способа взаимодействия с проводом или прибором.",
    "card1Tag": "Левый клик",
    "card1Title": "Коснуться рукой",
    "card1Desc": "Коснитесь провода или прибора напрямую. Если он под напряжением, вас ударит током.",
    "card2Tag": "Правый клик",
    "card2Title": "Проверить индикатором напряжения",
    "card2Desc": "Зелёный — нет напряжения, жёлтый — слабое напряжение, красный — сильное напряжение.",
    "tipLabel": "Запомните:",
    "tipText": "Сначала проверьте правым кликом. Касайтесь рукой только после подтверждения безопасности.",
    "sec2Title": "Фаза, ноль и заземление",
    "sec2Sub": "В одном кабеле живут три \"брата\", у каждого свой характер.",
    "wire1Title": "Фазный провод",
    "wire1Cn": "Красный/жёлтый/зелёный",
    "wire1Desc": "Подаёт электричество \"наружу\". Всегда под напряжением — прикосновение вызовет удар током.",
    "wire2Title": "Нулевой провод",
    "wire2Cn": "Синий",
    "wire2Desc": "Путь возврата тока после использования. Обычно не под напряжением, но бдительность терять нельзя.",
    "wire3Title": "Заземляющий провод",
    "wire3Cn": "Жёлто-зелёный",
    "wire3Desc": "Обычно без тока. Как только происходит утечка, он первым отводит ток в землю, защищая человека.",
    "sec3Title": "Как работает защита от утечки",
    "sec3Sub": "Тот маленький выключатель в электрощите на самом деле спасает жизни.",
    "diagSource": "Источник",
    "diagLiveIn": "Фаза (вход)",
    "diagGuard": "УЗО",
    "diagGuardSub": "Сравнивает вход/выход",
    "diagNeutralOut": "Ноль (выход)",
    "diagDevice": "Прибор",
    "diagLeak": "Утечка → Отключение",
    "rcdP1": "В норме входящий и исходящий ток равны. УЗО постоянно сравнивает эти два значения.",
    "rcdP2": "Как только кто-то получает удар током, часть тока идёт \"коротким путём\" через тело. Вход и выход перестают совпадать, и УЗО мгновенно отключает питание.",
    "func1Title": "Предотвращает удар током",
    "func1Desc": "Заранее отключает питание, снижая вред — часто спасает жизнь.",
    "func2Title": "Предотвращает возгорание",
    "func2Desc": "Длительная утечка вызывает нагрев и возгорание; УЗО отключает питание заранее.",
    "footer": "Это руководство предназначено только для использования в игре. В реальной жизни соблюдайте профессиональные электротехнические нормы — не разбирайте приборы и не прикасайтесь к неизвестной проводке самостоятельно."
  },
  "ja": {
    "title": "ゲームガイド",
    "navBrand": "安全電気マニュアル",
    "tab1": "基本操作",
    "tab2": "三本の線を知る",
    "tab3": "漏電保護",
    "heroEyebrow": "GAME MANUAL · 電気工事の基礎",
    "heroTitle": "ゲームガイド",
    "heroSub": "上のタブをクリックするか、下にスクロールしてください。",
    "sec1Title": "基本操作",
    "sec1Sub": "電線や電気製品への操作方法は二つあります。",
    "card1Tag": "左クリック",
    "card1Title": "手で触れる",
    "card1Desc": "電線や電気製品に直接触れます。通電していると感電します。",
    "card2Tag": "右クリック",
    "card2Title": "検電ペンでテスト",
    "card2Desc": "緑は無電、黄色は弱い電気、赤は強い電気を示します。",
    "tipLabel": "覚えておこう：",
    "tipText": "まず右クリックで検電し、安全を確認してから手で触れましょう。",
    "sec2Title": "ライブ線・ニュートラル線・アース線を知る",
    "sec2Sub": "一本のケーブルには性格の違う三兄弟が住んでいます。",
    "wire1Title": "ライブ線（火線）",
    "wire1Cn": "赤/黄/緑",
    "wire1Desc": "電気を\"送り出す\"線。常に通電しており、触れると感電します。",
    "wire2Title": "ニュートラル線（零線）",
    "wire2Cn": "青",
    "wire2Desc": "使用後の電気が\"戻る\"通路。通常は通電していませんが、油断は禁物です。",
    "wire3Title": "アース線（地線）",
    "wire3Cn": "黄緑ストライプ",
    "wire3Desc": "普段は通電していません。漏電が起きた瞬間、真っ先に電気を大地へ逃がして人を守ります。",
    "sec3Title": "漏電保護の仕組みと役割",
    "sec3Sub": "分電盤にあるあの小さなスイッチが、実は命を救う要です。",
    "diagSource": "電源",
    "diagLiveIn": "ライブ線 入",
    "diagGuard": "漏電遮断器",
    "diagGuardSub": "入/出を比較",
    "diagNeutralOut": "ニュートラル線 出",
    "diagDevice": "電気製品",
    "diagLeak": "漏電 → トリップ",
    "rcdP1": "正常時、入ってくる電流と出ていく電流は同じです。漏電遮断器は常にこの二つの数値を比較しています。",
    "rcdP2": "感電が起きると、電流の一部が人体を\"近道\"として流れます。入と出が一致しなくなり、漏電遮断器が即座にトリップして電源を遮断します。",
    "func1Title": "感電事故を防ぐ",
    "func1Desc": "事前に電源を遮断し、被害を減らします。命を救うことも少なくありません。",
    "func2Title": "電気火災を防ぐ",
    "func2Desc": "長期間の漏電は発熱・出火の原因になりますが、漏電遮断器が事前に電源を遮断します。",
    "footer": "本マニュアルはゲーム内の説明用です。現実生活では専門の電気工事規範に従い、自分で電気製品を分解したり、不明な配線に触れたりしないでください。"
  },
  "pt-BR": {
    "title": "Guia do Jogo",
    "navBrand": "Manual de Segurança Elétrica",
    "tab1": "Controles Básicos",
    "tab2": "Os Três Fios",
    "tab3": "Proteção contra Fuga de Corrente",
    "heroEyebrow": "GAME MANUAL · Fundamentos de Eletricista",
    "heroTitle": "Guia do Jogo",
    "heroSub": "Clique em uma aba acima ou role para baixo para ler.",
    "sec1Title": "Controles Básicos",
    "sec1Sub": "Há duas formas de interagir com fios ou aparelhos.",
    "card1Tag": "Clique Esquerdo",
    "card1Title": "Tocar com a Mão",
    "card1Desc": "Toque diretamente no fio ou aparelho. Se estiver energizado, você levará um choque.",
    "card2Tag": "Clique Direito",
    "card2Title": "Testar com o Testador de Tensão",
    "card2Desc": "Verde significa sem energia, amarelo baixa tensão, vermelho alta tensão.",
    "tipLabel": "Lembre-se:",
    "tipText": "Teste primeiro com o clique direito. Só considere tocar com a mão depois de confirmar que é seguro.",
    "sec2Title": "Fio Fase, Neutro e Terra",
    "sec2Sub": "Três \"irmãos\" moram no mesmo cabo, cada um com um temperamento diferente.",
    "wire1Title": "Fio Fase",
    "wire1Cn": "Vermelho/Amarelo/Verde",
    "wire1Desc": "Envia energia \"para fora\". Sempre energizado — tocar nele causa choque.",
    "wire2Title": "Fio Neutro",
    "wire2Cn": "Azul",
    "wire2Desc": "O caminho de retorno da energia após o uso. Normalmente sem energia, mas nunca baixe a guarda.",
    "wire3Title": "Fio Terra",
    "wire3Cn": "Amarelo-verde listrado",
    "wire3Desc": "Normalmente sem corrente. No momento de uma fuga, ele desvia a energia para a terra primeiro, protegendo você.",
    "sec3Title": "Como Funciona a Proteção contra Fuga de Corrente",
    "sec3Sub": "Aquele pequeno disjuntor no quadro elétrico é, na verdade, um salva-vidas.",
    "diagSource": "Fonte",
    "diagLiveIn": "Fase (entrada)",
    "diagGuard": "DR",
    "diagGuardSub": "Compara entrada/saída",
    "diagNeutralOut": "Neutro (saída)",
    "diagDevice": "Aparelho",
    "diagLeak": "Fuga → Desarme",
    "rcdP1": "Normalmente, a corrente que entra é igual à que sai. O DR compara esses dois valores constantemente.",
    "rcdP2": "No momento em que alguém leva um choque, parte da corrente faz um \"atalho\" pelo corpo. Entrada e saída deixam de bater, e o DR desarma instantaneamente, cortando a energia.",
    "func1Title": "Previne Choques Elétricos",
    "func1Desc": "Corta a energia antecipadamente para reduzir danos — muitas vezes salva vidas.",
    "func2Title": "Previne Incêndios Elétricos",
    "func2Desc": "Fuga de corrente prolongada gera calor e pode causar incêndio; o DR corta a energia antes disso.",
    "footer": "Este manual serve apenas como referência dentro do jogo. Na vida real, siga as normas elétricas profissionais — não desmonte aparelhos nem toque em fiação desconhecida por conta própria."
  },
  "es-LA": {
    "title": "Guía del juego",
    "navBrand": "Manual de seguridad eléctrica",
    "tab1": "Controles básicos",
    "tab2": "Los tres cables",
    "tab3": "Protección contra fugas",
    "heroEyebrow": "GAME MANUAL · Fundamentos de electricista",
    "heroTitle": "Guía del juego",
    "heroSub": "Haz clic en una pestaña arriba o desplázate hacia abajo.",
    "sec1Title": "Controles básicos",
    "sec1Sub": "Hay dos formas de interactuar con un cable o aparato.",
    "card1Tag": "Clic izquierdo",
    "card1Title": "Tocar con la mano",
    "card1Desc": "Toca directamente el cable o aparato. Si tiene corriente, recibirás una descarga.",
    "card2Tag": "Clic derecho",
    "card2Title": "Probar con el probador de voltaje",
    "card2Desc": "Verde significa sin corriente, amarillo voltaje bajo, rojo voltaje alto.",
    "tipLabel": "Recuerda:",
    "tipText": "Primero prueba con clic derecho. Solo considera tocar con la mano una vez confirmada la seguridad.",
    "sec2Title": "Cable vivo, neutro y tierra",
    "sec2Sub": "Tres \"hermanos\" viven en un mismo cable, cada uno con un temperamento distinto.",
    "wire1Title": "Cable vivo",
    "wire1Cn": "Rojo/Amarillo/Verde",
    "wire1Desc": "Envía la corriente \"hacia afuera\". Siempre con energía — tocarlo provoca una descarga.",
    "wire2Title": "Cable neutro",
    "wire2Cn": "Azul",
    "wire2Desc": "El camino de retorno de la corriente tras su uso. Normalmente sin energía, pero nunca bajes la guardia.",
    "wire3Title": "Cable de tierra",
    "wire3Cn": "Rayado amarillo-verde",
    "wire3Desc": "Normalmente sin corriente. En cuanto hay una fuga, desvía la corriente hacia la tierra primero para protegerte.",
    "sec3Title": "Cómo funciona la protección contra fugas",
    "sec3Sub": "Ese pequeño interruptor en el tablero eléctrico es, en realidad, un salvavidas.",
    "diagSource": "Fuente",
    "diagLiveIn": "Vivo (entrada)",
    "diagGuard": "Diferencial",
    "diagGuardSub": "Compara entrada/salida",
    "diagNeutralOut": "Neutro (salida)",
    "diagDevice": "Aparato",
    "diagLeak": "Fuga → Disparo",
    "rcdP1": "Normalmente, la corriente que entra es igual a la que sale. El diferencial compara constantemente estos dos valores.",
    "rcdP2": "En el momento en que alguien recibe una descarga, parte de la corriente toma un \"atajo\" a través del cuerpo. La entrada y la salida dejan de coincidir, y el diferencial se dispara al instante, cortando la energía.",
    "func1Title": "Previene descargas eléctricas",
    "func1Desc": "Corta la energía con anticipación para reducir el daño — muchas veces salva vidas.",
    "func2Title": "Previene incendios eléctricos",
    "func2Desc": "Una fuga prolongada genera calor y puede causar un incendio; el diferencial corta la energía antes de que eso ocurra.",
    "footer": "Este manual es solo una referencia dentro del juego. En la vida real, sigue las normas eléctricas profesionales — no desarmes aparatos ni toques cableado desconocido por tu cuenta."
  },
  "ko": {
    "title": "게임 가이드",
    "navBrand": "안전 전기 매뉴얼",
    "tab1": "기본 조작",
    "tab2": "세 가닥의 선",
    "tab3": "누전 차단",
    "heroEyebrow": "GAME MANUAL · 전기공 기초",
    "heroTitle": "게임 가이드",
    "heroSub": "위의 탭을 클릭하거나 아래로 스크롤하세요.",
    "sec1Title": "기본 조작",
    "sec1Sub": "전선이나 전기 제품을 다루는 방법은 두 가지입니다.",
    "card1Tag": "마우스 왼쪽 클릭",
    "card1Title": "손으로 만지기",
    "card1Desc": "전선이나 전기 제품을 직접 만집니다. 전기가 흐르면 감전됩니다.",
    "card2Tag": "마우스 오른쪽 클릭",
    "card2Title": "검전기로 테스트",
    "card2Desc": "녹색은 무전압, 노란색은 약한 전압, 빨간색은 강한 전압을 의미합니다.",
    "tipLabel": "기억하세요:",
    "tipText": "먼저 오른쪽 클릭으로 검전한 후, 안전이 확인되면 손으로 만지는 것을 고려하세요.",
    "sec2Title": "상선, 중성선, 접지선 알아보기",
    "sec2Sub": "한 케이블 안에 성격이 다른 세 형제가 살고 있습니다.",
    "wire1Title": "상선(핫선)",
    "wire1Cn": "빨강/노랑/초록",
    "wire1Desc": "전기를 \"내보내는\" 선입니다. 항상 전기가 흐르며, 만지면 감전됩니다.",
    "wire2Title": "중성선",
    "wire2Cn": "파랑",
    "wire2Desc": "사용 후 전기가 \"돌아오는\" 통로입니다. 평소에는 전기가 흐르지 않지만 절대 방심해서는 안 됩니다.",
    "wire3Title": "접지선",
    "wire3Cn": "노랑-초록 줄무늬",
    "wire3Desc": "평소에는 전기가 흐르지 않습니다. 누전이 발생하는 순간, 가장 먼저 전기를 땅으로 흘려보내 사람을 보호합니다.",
    "sec3Title": "누전 차단기의 원리와 역할",
    "sec3Sub": "분전반의 그 작은 스위치가 사실은 생명을 구하는 핵심입니다.",
    "diagSource": "전원",
    "diagLiveIn": "상선 유입",
    "diagGuard": "누전차단기",
    "diagGuardSub": "유입/유출 비교",
    "diagNeutralOut": "중성선 유출",
    "diagDevice": "전기 제품",
    "diagLeak": "누전 → 차단",
    "rcdP1": "정상적인 상태에서는 들어오는 전류와 나가는 전류가 같습니다. 누전차단기는 이 두 값을 계속 비교합니다.",
    "rcdP2": "누군가 감전되는 순간, 일부 전류가 인체를 통해 \"지름길\"로 흐릅니다. 유입과 유출이 일치하지 않게 되어 누전차단기가 즉시 작동하여 전원을 차단합니다.",
    "func1Title": "감전 사고 예방",
    "func1Desc": "미리 전원을 차단하여 피해를 줄이며, 종종 생명을 구합니다.",
    "func2Title": "전기 화재 예방",
    "func2Desc": "장기간의 누전은 발열과 화재의 원인이 되지만, 누전차단기가 미리 전원을 차단합니다.",
    "footer": "본 매뉴얼은 게임 내 설명용입니다. 실생활에서는 전문 전기 규정을 따르고, 스스로 전기 제품을 분해하거나 알 수 없는 배선을 만지지 마세요."
  }
};
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

  /* hazard stripe utility */
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
    max-width:920px;margin:0 auto;
    display:flex;align-items:center;gap:4px;
    padding:0 20px;
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
    transition:color .2s;
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
  .doc{max-width:920px;margin:0 auto;padding:0 20px 80px;position:relative;}

  /* ===== HERO ===== */
  .hero{padding:64px 0 40px;}
  .hero .eyebrow{
    color:var(--yellow);font-family:'Rajdhani',sans-serif;font-weight:700;
    font-size:13px;letter-spacing:.25em;text-transform:uppercase;margin-bottom:14px;
  }
  .hero h1{
    font-size:clamp(32px,6vw,48px);margin:0 0 14px;color:var(--text);
  }
  .hero p{color:var(--text-muted);font-size:17px;max-width:520px;margin:0;}

  /* ===== SECTION ===== */
  section{padding:56px 0;border-top:1px solid var(--line);scroll-margin-top:70px;}
  .sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:8px;}
  .sec-head .idx{font-family:'Rajdhani',sans-serif;font-size:18px;color:var(--text-faint);}
  .sec-head h2{font-size:30px;margin:0;color:var(--text);}
  .sec-sub{color:var(--text-muted);font-size:16px;margin:0 0 32px;max-width:600px;}

  /* ===== CONTROL CARDS (section 1) ===== */
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
  .ctrl-icon{position:absolute;right:14px;top:14px;width:44px;height:44px;opacity:.9;}
  .tip{
    margin-top:20px;background:var(--panel-alt);border-left:3px solid var(--yellow);
    padding:14px 16px;border-radius:0 8px 8px 0;font-size:16px;color:var(--text);
  }
  .tip b{color:var(--yellow);}

  /* ===== WIRE CARDS (section 2) ===== */
  .wire-row{
    display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:flex-start;
    padding:18px;background:var(--panel);border-radius:10px;margin-bottom:14px;border:1px solid var(--line);
  }
  .wire-chip{
    width:54px;height:54px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;color:#161616;
  }
  .wire-chip.live{background:var(--live);}
  .wire-chip.neutral{background:var(--neutral);}
  .wire-chip.ground{background:repeating-linear-gradient(45deg,var(--ground-a) 0 8px, var(--ground-b) 8px 16px);}
  .wire-row h3{margin:2px 0 6px;font-size:19px;}
  .wire-row h3 .cn{color:var(--text-faint);font-weight:400;font-size:14px;margin-left:6px;}
  .wire-row p{margin:0;color:var(--text-muted);font-size:16px;}

  .analogy{
    margin-top:24px;padding:20px;border:1px dashed var(--line);border-radius:10px;
    background:var(--panel-alt);
  }
  .analogy .lab{font-family:'Rajdhani',sans-serif;color:var(--yellow);font-size:12px;letter-spacing:.15em;margin-bottom:8px;}
  .analogy p{margin:0;font-size:16px;color:var(--text);}

  /* ===== RCD SECTION (section 3) ===== */
  .rcd-panel{
    background:var(--panel);border:1px solid var(--line);border-radius:12px;
    padding:24px;margin-bottom:24px;
  }
  .stat-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px;}
  .stat{
    flex:1;min-width:140px;background:var(--panel-alt);border-radius:8px;padding:14px 16px;
    border:1px solid var(--line);
  }
  .stat .v{font-family:'Rajdhani',sans-serif;font-size:24px;color:var(--yellow);font-weight:700;}
  .stat .l{font-size:14px;color:var(--text-muted);margin-top:2px;}
  .func-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  @media (max-width:640px){.func-grid{grid-template-columns:1fr;}}
  .func-card{
    background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px 18px;
  }
  .func-card .n{font-family:'Rajdhani',sans-serif;color:var(--text-faint);font-size:12px;}
  .func-card h4{margin:6px 0 6px;font-size:18px;}
  .func-card p{margin:0;color:var(--text-muted);font-size:15px;}

  footer{
    max-width:920px;margin:0 auto;padding:40px 20px 60px;
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
    <button class="tab" data-target="sec3"><span class="num">03</span>${t.tab3}</button>
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
      <div class="ctrl-card warn">
        <svg class="ctrl-icon" viewBox="0 0 48 48" fill="none">
          <path d="M14 30c-2-6 0-14 6-18 5-3 12-1 14 4 1 3 0 6-2 8l-4 4v8H16v-6z" stroke="#ff9089" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M16 40h12" stroke="#ff9089" stroke-width="2.2"/>
        </svg>
        <span class="btn-tag left">${t.card1Tag}</span>
        <h3>${t.card1Title}</h3>
        <p>${t.card1Desc}</p>
      </div>

      <div class="ctrl-card safe">
        <svg class="ctrl-icon" viewBox="0 0 48 48" fill="none">
          <rect x="21" y="8" width="6" height="22" rx="3" stroke="#8fc5ea" stroke-width="2.2"/>
          <circle cx="24" cy="8" r="3" fill="#ffc53d"/>
          <path d="M18 34h12l-2 8h-8z" stroke="#8fc5ea" stroke-width="2.2" stroke-linejoin="round"/>
        </svg>
        <span class="btn-tag right">${t.card2Tag}</span>
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
      <div class="wire-chip live">L</div>
      <div>
        <h3>${t.wire1Title}<span class="cn">${t.wire1Cn}</span></h3>
        <p>${t.wire1Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip neutral">N</div>
      <div>
        <h3>${t.wire2Title}<span class="cn">${t.wire2Cn}</span></h3>
        <p>${t.wire2Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip ground">PE</div>
      <div>
        <h3>${t.wire3Title}<span class="cn">${t.wire3Cn}</span></h3>
        <p>${t.wire3Desc}</p>
      </div>
    </div>

  </section>

  <!-- ================= SECTION 3 ================= -->
  <section id="sec3">
    <div class="sec-head"><span class="idx mono">03</span><h2>${t.sec3Title}</h2></div>
    <p class="sec-sub">${t.sec3Sub}</p>

    <div class="rcd-panel">
      <svg viewBox="0 0 600 190" width="100%" height="auto" style="display:block;">
        <rect x="0" y="0" width="600" height="190" fill="none"/>
        <!-- source -->
        <rect x="10" y="75" width="60" height="40" rx="6" fill="#212429" stroke="#33363d"/>
        <text x="40" y="100" text-anchor="middle" fill="#9aa0a6" font-size="12" font-family="JetBrains Mono">${t.diagSource}</text>
        <!-- live line in -->
        <path d="M70 83 H250" stroke="#e8453c" stroke-width="3"/>
        <text x="150" y="75" text-anchor="middle" fill="#ff9089" font-size="12" font-family="JetBrains Mono">${t.diagLiveIn}</text>
        <!-- guard box -->
        <rect x="250" y="60" width="90" height="70" rx="8" fill="#1b1d22" stroke="#ffc53d" stroke-width="2"/>
        <text x="295" y="90" text-anchor="middle" fill="#ffc53d" font-size="13" font-family="JetBrains Mono" font-weight="700">${t.diagGuard}</text>
        <text x="295" y="108" text-anchor="middle" fill="#7a6524" font-size="10" font-family="JetBrains Mono">${t.diagGuardSub}</text>
        <!-- neutral line out -->
        <path d="M340 107 H520" stroke="#3b8ec4" stroke-width="3"/>
        <text x="450" y="99" text-anchor="middle" fill="#8fc5ea" font-size="12" font-family="JetBrains Mono">${t.diagNeutralOut}</text>
        <!-- device -->
        <rect x="520" y="75" width="60" height="40" rx="6" fill="#212429" stroke="#33363d"/>
        <text x="550" y="100" text-anchor="middle" fill="#9aa0a6" font-size="12" font-family="JetBrains Mono">${t.diagDevice}</text>
        <!-- leak path -->
        <path d="M340 75 C 320 25, 400 25, 400 60" stroke="#ff9089" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
        <rect x="345" y="8" width="110" height="20" rx="4" fill="#121316"/>
        <text x="400" y="22" text-anchor="middle" fill="#ff9089" font-size="12" font-family="JetBrains Mono">${t.diagLeak}</text>
      </svg>

      <p style="margin-top:6px;color:var(--text-muted);font-size:16px;">
        ${t.rcdP1}
      </p>
      <p style="color:var(--text-muted);font-size:16px;">
        ${t.rcdP2}
      </p>
    </div>

    <div class="func-grid">
      <div class="func-card">
        <div class="n mono">FUNCTION 01</div>
        <h4>${t.func1Title}</h4>
        <p>${t.func1Desc}</p>
      </div>
      <div class="func-card">
        <div class="n mono">FUNCTION 02</div>
        <h4>${t.func2Title}</h4>
        <p>${t.func2Desc}</p>
      </div>
    </div>
  </section>
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
