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
    "navBrand": "静电小知识",
    "tab1": "静电原理",
    "tab2": "静电的产生",
    "tab3": "预防措施",
    "heroEyebrow": "GAME MANUAL · 电工作业入门",
    "heroTitle": "游戏指南",
    "heroSub": "点击上方标签跳转，或直接向下滚动阅读——带你用最简单的方式，搞懂身边无处不在的静电。",
    "sec1Title": "静电原理",
    "sec1Sub": "万物都是由原子组成的，原子里带正电的质子和带负电的电子，本来是\"你不欠我、我不欠你\"的平衡状态。",
    "card1Tag": "摩擦",
    "card1Title": "摩擦起电",
    "card1Desc": "两种不同的材料互相摩擦时，电子会从一种材料\"跑\"到另一种材料上。得到电子的一方带负电，失去电子的一方带正电，这就是静电的来源。",
    "card2Tag": "同异性",
    "card2Title": "同性相斥，异性相吸",
    "card2Desc": "带同种电荷的物体会互相排斥，带不同电荷的物体则会互相吸引。冬天头发经常\"飘\"起来吸在脸上或者衣服上，就是这个道理。",
    "tipLabel": "记住：",
    "tipText": "静电不是电\"流\"，而是电荷暂时\"堆积\"在物体表面，跟家里电线里持续流动的电不是一回事。",
    "sec2Title": "日常生活中静电的产生",
    "sec2Sub": "这些场景，你一定都遇到过。",
    "item1Title": "干燥的天气",
    "item1Sub": "尤其是冬天",
    "item1Desc": "空气湿度低的时候，电荷不容易顺着空气中的水分子\"溜走\"，就会越积越多，所以冬天更容易被静电\"电到\"。",
    "item2Title": "脱衣服",
    "item2Sub": "尤其是化纤外套",
    "item2Desc": "脱化纤材质的外套时，衣物和身体、衣物和衣物之间互相摩擦，会让电子转移，在身上和衣服上积累静电。",
    "item3Title": "梳头发",
    "item3Sub": "塑料梳子最明显",
    "item3Desc": "用塑料梳子梳干燥的头发时，梳子和头发之间摩擦生电，头发会带上同种电荷，互相排斥\"炸开\"，飘起来吸在脸上或衣服上。",
    "sec3Title": "可以避免静电的措施",
    "sec3Sub": "几个简单的小动作，就能让静电\"安静\"下来。",
    "func1Title": "增加空气湿度",
    "func1Desc": "用加湿器，或者在房间里放一盆水，能让空气中多一些水分，电荷更容易随湿气流失，不容易积累。",
    "func2Title": "先用手掌摸一下墙壁、木门",
    "func2Desc": "用手掌大面积、慢慢地接触墙壁或木门等不导电的物体，让身上的静电缓慢分散释放，就不会在指尖集中放电。",
    "func3Title": "用小金属物件先排电",
    "func3Desc": "碰金属门把手前，先用钥匙或硬币触碰一下，让电荷从金属物件上先放掉，替手指\"挨\"这一下。",
    "tip2Label": "此外：",
    "tip2Text": "尽量穿纯棉等天然材质的衣物，少穿化纤材质，能从源头上减少摩擦生电，也能少挨\"电\"。",
    "footer": "本页内容为静电知识科普，帮助大家更好理解身边看不见的静电现象。"
  },
  "zh-TW": {
    "title": "遊戲指南",
    "navBrand": "靜電小知識",
    "tab1": "靜電原理",
    "tab2": "靜電的產生",
    "tab3": "預防措施",
    "heroEyebrow": "GAME MANUAL · 電工作業入門",
    "heroTitle": "遊戲指南",
    "heroSub": "點擊上方標籤跳轉，或直接向下滾動閱讀——帶你用最簡單的方式，搞懂身邊無處不在的靜電。",
    "sec1Title": "靜電原理",
    "sec1Sub": "萬物都是由原子組成的，原子裡帶正電的質子和帶負電的電子，本來是\"你不欠我、我不欠你\"的平衡狀態。",
    "card1Tag": "摩擦",
    "card1Title": "摩擦起電",
    "card1Desc": "兩種不同的材料互相摩擦時，電子會從一種材料\"跑\"到另一種材料上。得到電子的一方帶負電，失去電子的一方帶正電，這就是靜電的來源。",
    "card2Tag": "同異性",
    "card2Title": "同性相斥，異性相吸",
    "card2Desc": "帶同種電荷的物體會互相排斥，帶不同電荷的物體則會互相吸引。冬天頭髮經常\"飄\"起來吸在臉上或者衣服上，就是這個道理。",
    "tipLabel": "記住：",
    "tipText": "靜電不是電\"流\"，而是電荷暫時\"堆積\"在物體表面，跟家裡電線裡持續流動的電不是一回事。",
    "sec2Title": "日常生活中靜電的產生",
    "sec2Sub": "這些場景，你一定都遇到過。",
    "item1Title": "乾燥的天氣",
    "item1Sub": "尤其是冬天",
    "item1Desc": "空氣濕度低的時候，電荷不容易順著空氣中的水分子\"溜走\"，就會越積越多，所以冬天更容易被靜電\"電到\"。",
    "item2Title": "脫衣服",
    "item2Sub": "尤其是化纖外套",
    "item2Desc": "脫化纖材質的外套時，衣物和身體、衣物和衣物之間互相摩擦，會讓電子轉移，在身上和衣服上積累靜電。",
    "item3Title": "梳頭髮",
    "item3Sub": "塑膠梳子最明顯",
    "item3Desc": "用塑膠梳子梳乾燥的頭髮時，梳子和頭髮之間摩擦生電，頭髮會帶上同種電荷，互相排斥\"炸開\"，飄起來吸在臉上或衣服上。",
    "sec3Title": "可以避免靜電的措施",
    "sec3Sub": "幾個簡單的小動作，就能讓靜電\"安靜\"下來。",
    "func1Title": "增加空氣濕度",
    "func1Desc": "用加濕器，或者在房間裡放一盆水，能讓空氣中多一些水分，電荷更容易隨濕氣流失，不容易積累。",
    "func2Title": "先用手掌摸一下牆壁、木門",
    "func2Desc": "用手掌大面積、慢慢地接觸牆壁或木門等不導電的物體，讓身上的靜電緩慢分散釋放，就不會在指尖集中放電。",
    "func3Title": "用小金屬物件先排電",
    "func3Desc": "碰金屬門把手前，先用鑰匙或硬幣觸碰一下，讓電荷從金屬物件上先放掉，替手指\"挨\"這一下。",
    "tip2Label": "此外：",
    "tip2Text": "盡量穿純棉等天然材質的衣物，少穿化纖材質，能從源頭上減少摩擦生電，也能少挨\"電\"。",
    "footer": "本頁內容為靜電知識科普，幫助大家更好理解身邊看不見的靜電現象。"
  },
  "en": {
    "title": "Game Guide",
    "navBrand": "Static Electricity 101",
    "tab1": "How It Works",
    "tab2": "Where It Comes From",
    "tab3": "How to Avoid It",
    "heroEyebrow": "GAME MANUAL · Electrician Basics",
    "heroTitle": "Game Guide",
    "heroSub": "Click a tab above to jump, or scroll down to read — a simple guide to the static electricity all around you.",
    "sec1Title": "How Static Electricity Works",
    "sec1Sub": "Everything is made of atoms. Inside each atom, positive protons and negative electrons normally balance each other out.",
    "card1Tag": "Friction",
    "card1Title": "Charging by Friction",
    "card1Desc": "When two different materials rub against each other, electrons \"jump\" from one to the other. Whichever gains electrons becomes negatively charged, and whichever loses them becomes positively charged — that's where static electricity comes from.",
    "card2Tag": "Attract/Repel",
    "card2Title": "Like Charges Repel, Opposites Attract",
    "card2Desc": "Objects with the same charge push each other away, while objects with opposite charges pull toward each other. That's why your hair often flies up and sticks to your face or clothes in winter.",
    "tipLabel": "Remember:",
    "tipText": "Static electricity isn't a \"current\" — it's charge that temporarily piles up on a surface, unlike the current that constantly flows through your home's wiring.",
    "sec2Title": "Where Static Electricity Comes From",
    "sec2Sub": "You've definitely run into these situations before.",
    "item1Title": "Dry Weather",
    "item1Sub": "Especially in winter",
    "item1Desc": "When humidity is low, charge can't easily \"slip away\" through moisture in the air, so it keeps building up — which is why static shocks happen more in winter.",
    "item2Title": "Taking Off a Jacket",
    "item2Sub": "Synthetic fabrics especially",
    "item2Desc": "Taking off a synthetic jacket makes the fabric rub against your body and other clothing, transferring electrons and building up static on you and your clothes.",
    "item3Title": "Combing Your Hair",
    "item3Sub": "Plastic combs are the worst",
    "item3Desc": "Combing dry hair with a plastic comb generates friction between the comb and your hair. The hair ends up with the same charge, so strands repel each other and fly up, sticking to your face or clothes.",
    "sec3Title": "How to Avoid Static Electricity",
    "sec3Sub": "A few simple habits can keep static electricity quiet.",
    "func1Title": "Add Moisture to the Air",
    "func1Desc": "Use a humidifier, or just leave a basin of water in the room — extra moisture in the air helps charge drain away instead of building up.",
    "func2Title": "Touch a Wall or Wooden Door First",
    "func2Desc": "Press your palm slowly and broadly against a wall or wooden door (something that doesn't conduct well). This lets the charge on your body spread out and release gradually instead of sparking from your fingertip.",
    "func3Title": "Discharge with a Small Metal Object",
    "func3Desc": "Before touching a metal door handle, tap it first with a key or a coin. Let the charge jump through the metal object instead of your finger.",
    "tip2Label": "Also:",
    "tip2Text": "Wearing cotton and other natural fabrics instead of synthetics cuts down on friction-generated charge at the source, so you'll get shocked less often.",
    "footer": "This page is for general knowledge about static electricity, to help you better understand the invisible static around you."
  },
  "de": {
    "title": "Spielanleitung",
    "navBrand": "Statische Elektrizität 101",
    "tab1": "Wie sie entsteht",
    "tab2": "Wo sie auftritt",
    "tab3": "Wie man sie vermeidet",
    "heroEyebrow": "GAME MANUAL · Elektriker-Grundlagen",
    "heroTitle": "Spielanleitung",
    "heroSub": "Klicke oben auf einen Tab oder scrolle einfach nach unten — eine einfache Erklärung der statischen Elektrizität um dich herum.",
    "sec1Title": "Wie statische Elektrizität entsteht",
    "sec1Sub": "Alles besteht aus Atomen. In jedem Atom halten sich positiv geladene Protonen und negativ geladene Elektronen normalerweise die Waage.",
    "card1Tag": "Reibung",
    "card1Title": "Aufladung durch Reibung",
    "card1Desc": "Wenn zwei unterschiedliche Materialien aneinander reiben, \"springen\" Elektronen von einem Material zum anderen. Wer Elektronen gewinnt, wird negativ geladen, wer sie verliert, positiv — daher kommt statische Elektrizität.",
    "card2Tag": "Anziehung/Abstoßung",
    "card2Title": "Gleiche Ladungen stoßen sich ab, entgegengesetzte ziehen sich an",
    "card2Desc": "Objekte mit gleicher Ladung stoßen sich ab, Objekte mit entgegengesetzter Ladung ziehen sich an. Deshalb fliegen Haare im Winter oft hoch und bleiben im Gesicht oder an der Kleidung kleben.",
    "tipLabel": "Merke dir:",
    "tipText": "Statische Elektrizität ist kein \"fließender\" Strom, sondern Ladung, die sich vorübergehend auf einer Oberfläche ansammelt — anders als der Strom, der ständig durch die Kabel zu Hause fließt.",
    "sec2Title": "Wo statische Elektrizität im Alltag entsteht",
    "sec2Sub": "Diese Situationen kennst du bestimmt.",
    "item1Title": "Trockenes Wetter",
    "item1Sub": "Besonders im Winter",
    "item1Desc": "Bei niedriger Luftfeuchtigkeit kann Ladung nicht leicht über die Feuchtigkeit in der Luft \"entweichen\" und sammelt sich deshalb an — daher gibt es im Winter häufiger statische Schläge.",
    "item2Title": "Die Jacke ausziehen",
    "item2Sub": "Besonders bei synthetischen Stoffen",
    "item2Desc": "Beim Ausziehen einer synthetischen Jacke reibt der Stoff an deinem Körper und an anderer Kleidung, wodurch Elektronen übertragen werden und sich Ladung auf dir und deiner Kleidung ansammelt.",
    "item3Title": "Haare kämmen",
    "item3Sub": "Besonders mit Plastikkämmen",
    "item3Desc": "Beim Kämmen trockener Haare mit einem Plastikkamm entsteht Reibung zwischen Kamm und Haar. Die Haare erhalten dieselbe Ladung, stoßen sich gegenseitig ab und fliegen hoch, wobei sie im Gesicht oder an der Kleidung kleben bleiben.",
    "sec3Title": "Wie man statische Elektrizität vermeidet",
    "sec3Sub": "Ein paar einfache Gewohnheiten halten statische Elektrizität in Schach.",
    "func1Title": "Luftfeuchtigkeit erhöhen",
    "func1Desc": "Benutze einen Luftbefeuchter oder stelle eine Schüssel Wasser ins Zimmer — mehr Feuchtigkeit in der Luft hilft, dass Ladung abfließt statt sich anzusammeln.",
    "func2Title": "Erst eine Wand oder Holztür berühren",
    "func2Desc": "Lege deine Handfläche langsam und großflächig an eine Wand oder Holztür (etwas, das schlecht leitet). So kann sich die Ladung auf deinem Körper allmählich verteilen und entladen, statt an der Fingerspitze zu funken.",
    "func3Title": "Mit einem kleinen Metallgegenstand entladen",
    "func3Desc": "Bevor du eine Türklinke aus Metall berührst, tippe sie zuerst mit einem Schlüssel oder einer Münze an. So springt die Ladung über den Metallgegenstand statt über deinen Finger.",
    "tip2Label": "Außerdem:",
    "tip2Text": "Baumwolle und andere Naturfasern statt Synthetik zu tragen, verringert die Reibungsladung schon an der Quelle — so bekommst du seltener einen Schlag.",
    "footer": "Diese Seite dient der allgemeinen Aufklärung über statische Elektrizität, um dir zu helfen, das unsichtbare Phänomen um dich herum besser zu verstehen."
  },
  "fr": {
    "title": "Guide du jeu",
    "navBrand": "L'électricité statique en bref",
    "tab1": "Comment ça marche",
    "tab2": "D'où ça vient",
    "tab3": "Comment l'éviter",
    "heroEyebrow": "GAME MANUAL · Bases d'électricien",
    "heroTitle": "Guide du jeu",
    "heroSub": "Cliquez sur un onglet ci-dessus ou faites défiler vers le bas — un guide simple sur l'électricité statique qui vous entoure.",
    "sec1Title": "Comment fonctionne l'électricité statique",
    "sec1Sub": "Tout est fait d'atomes. Dans chaque atome, les protons chargés positivement et les électrons chargés négativement s'équilibrent normalement.",
    "card1Tag": "Friction",
    "card1Title": "Charge par friction",
    "card1Desc": "Quand deux matériaux différents se frottent l'un contre l'autre, des électrons \"sautent\" de l'un à l'autre. Celui qui gagne des électrons se charge négativement, celui qui en perd se charge positivement — c'est l'origine de l'électricité statique.",
    "card2Tag": "Attraction/Répulsion",
    "card2Title": "Les charges identiques se repoussent, les charges opposées s'attirent",
    "card2Desc": "Les objets ayant la même charge se repoussent, tandis que ceux ayant des charges opposées s'attirent. C'est pourquoi vos cheveux s'envolent souvent et collent à votre visage ou vos vêtements en hiver.",
    "tipLabel": "Retenez :",
    "tipText": "L'électricité statique n'est pas un \"courant\" — c'est une charge qui s'accumule temporairement à la surface d'un objet, contrairement au courant qui circule en permanence dans les câbles de votre maison.",
    "sec2Title": "D'où vient l'électricité statique au quotidien",
    "sec2Sub": "Vous avez sûrement déjà vécu ces situations.",
    "item1Title": "Le temps sec",
    "item1Sub": "Surtout en hiver",
    "item1Desc": "Quand l'humidité est faible, la charge ne peut pas facilement \"s'échapper\" via l'humidité de l'air, et elle s'accumule donc davantage — c'est pourquoi les décharges statiques sont plus fréquentes en hiver.",
    "item2Title": "Enlever une veste",
    "item2Sub": "Surtout en tissu synthétique",
    "item2Desc": "Enlever une veste en tissu synthétique fait frotter le tissu contre votre corps et d'autres vêtements, transférant des électrons et accumulant de la charge statique sur vous et vos vêtements.",
    "item3Title": "Se coiffer",
    "item3Sub": "Surtout avec un peigne en plastique",
    "item3Desc": "Se coiffer les cheveux secs avec un peigne en plastique crée de la friction entre le peigne et les cheveux. Les cheveux se retrouvent chargés de la même façon, se repoussent entre eux et s'envolent, collant au visage ou aux vêtements.",
    "sec3Title": "Comment éviter l'électricité statique",
    "sec3Sub": "Quelques gestes simples suffisent à calmer l'électricité statique.",
    "func1Title": "Augmenter l'humidité de l'air",
    "func1Desc": "Utilisez un humidificateur, ou laissez simplement un bol d'eau dans la pièce — un peu plus d'humidité dans l'air aide la charge à s'écouler au lieu de s'accumuler.",
    "func2Title": "Toucher d'abord un mur ou une porte en bois",
    "func2Desc": "Posez votre paume lentement et largement sur un mur ou une porte en bois (un objet peu conducteur). Cela permet à la charge de votre corps de se répartir et de se libérer progressivement, au lieu de faire une étincelle au bout du doigt.",
    "func3Title": "Décharger avec un petit objet métallique",
    "func3Desc": "Avant de toucher une poignée de porte métallique, touchez-la d'abord avec une clé ou une pièce de monnaie. La charge passera par l'objet métallique plutôt que par votre doigt.",
    "tip2Label": "De plus :",
    "tip2Text": "Porter du coton ou d'autres fibres naturelles plutôt que du synthétique réduit la charge générée par friction dès la source, et vous serez moins souvent électrocuté.",
    "footer": "Cette page propose des connaissances générales sur l'électricité statique, pour mieux comprendre ce phénomène invisible qui vous entoure."
  },
  "ru": {
    "title": "Руководство по игре",
    "navBrand": "Основы статического электричества",
    "tab1": "Как это работает",
    "tab2": "Откуда берётся",
    "tab3": "Как избежать",
    "heroEyebrow": "GAME MANUAL · Основы электрика",
    "heroTitle": "Руководство по игре",
    "heroSub": "Нажмите на вкладку выше или прокрутите вниз — простое объяснение статического электричества вокруг вас.",
    "sec1Title": "Как работает статическое электричество",
    "sec1Sub": "Всё состоит из атомов. Внутри каждого атома положительно заряженные протоны и отрицательно заряженные электроны обычно уравновешивают друг друга.",
    "card1Tag": "Трение",
    "card1Title": "Электризация трением",
    "card1Desc": "Когда два разных материала трутся друг о друга, электроны \"перескакивают\" с одного на другой. Тот, кто получает электроны, заряжается отрицательно, а тот, кто их теряет — положительно. Так и возникает статическое электричество.",
    "card2Tag": "Притяжение/отталкивание",
    "card2Title": "Одинаковые заряды отталкиваются, разные — притягиваются",
    "card2Desc": "Объекты с одинаковым зарядом отталкиваются друг от друга, а с разными — притягиваются. Поэтому зимой волосы часто \"взлетают\" и прилипают к лицу или одежде.",
    "tipLabel": "Запомните:",
    "tipText": "Статическое электричество — это не \"ток\", а заряд, который временно скапливается на поверхности предмета, в отличие от тока, который постоянно течёт по проводам в доме.",
    "sec2Title": "Откуда берётся статическое электричество в быту",
    "sec2Sub": "Вы наверняка сталкивались с этими ситуациями.",
    "item1Title": "Сухая погода",
    "item1Sub": "Особенно зимой",
    "item1Desc": "При низкой влажности заряду сложнее \"утечь\" через влагу в воздухе, поэтому он накапливается — из-за этого зимой чаще бьёт статикой.",
    "item2Title": "Снимаете куртку",
    "item2Sub": "Особенно из синтетики",
    "item2Desc": "Когда вы снимаете синтетическую куртку, ткань трётся о тело и другую одежду, электроны переходят между ними, и на вас и одежде накапливается статика.",
    "item3Title": "Расчёсываете волосы",
    "item3Sub": "Особенно пластиковой расчёской",
    "item3Desc": "При расчёсывании сухих волос пластиковой расчёской между ней и волосами возникает трение. Волосы получают одинаковый заряд, отталкиваются друг от друга и \"разлетаются\", прилипая к лицу или одежде.",
    "sec3Title": "Как избежать статического электричества",
    "sec3Sub": "Несколько простых привычек помогут усмирить статику.",
    "func1Title": "Повысить влажность воздуха",
    "func1Desc": "Используйте увлажнитель или просто оставьте в комнате миску с водой — дополнительная влага в воздухе помогает заряду стекать, а не накапливаться.",
    "func2Title": "Сначала коснитесь стены или деревянной двери",
    "func2Desc": "Медленно прижмите ладонь всей поверхностью к стене или деревянной двери (плохо проводящему предмету). Это позволит заряду на теле постепенно рассеяться, а не разрядиться искрой с кончика пальца.",
    "func3Title": "Разрядитесь через небольшой металлический предмет",
    "func3Desc": "Прежде чем коснуться металлической дверной ручки, сначала прикоснитесь к ней ключом или монетой. Заряд пройдёт через металлический предмет, а не через ваш палец.",
    "tip2Label": "Кроме того:",
    "tip2Text": "Ношение хлопка и других натуральных тканей вместо синтетики снижает выработку заряда трением уже на источнике — так вас будет бить статикой реже.",
    "footer": "Эта страница содержит общие сведения о статическом электричестве, чтобы помочь вам лучше понять это невидимое явление вокруг вас."
  },
  "ja": {
    "title": "ゲームガイド",
    "navBrand": "静電気のきほん",
    "tab1": "静電気の仕組み",
    "tab2": "静電気の発生",
    "tab3": "予防のコツ",
    "heroEyebrow": "GAME MANUAL · 電気工事の基礎",
    "heroTitle": "ゲームガイド",
    "heroSub": "上のタブをクリックするか、下にスクロールしてください——身の回りの静電気を、いちばん分かりやすく解説します。",
    "sec1Title": "静電気の仕組み",
    "sec1Sub": "すべてのものは原子でできています。原子の中では、プラスの電気を持つ陽子とマイナスの電気を持つ電子が、普段はつり合っています。",
    "card1Tag": "摩擦",
    "card1Title": "摩擦で電気が生まれる",
    "card1Desc": "異なる二つの素材がこすれ合うと、電子が一方からもう一方へ\"移動\"します。電子を受け取った方はマイナスに、失った方はプラスに帯電します。これが静電気の正体です。",
    "card2Tag": "引力・斥力",
    "card2Title": "同じ電気は反発し、違う電気は引き合う",
    "card2Desc": "同じ種類の電気を帯びたもの同士は反発し合い、違う種類のもの同士は引き合います。冬に髪の毛が顔や服にくっついてしまうのも、これが理由です。",
    "tipLabel": "覚えておこう：",
    "tipText": "静電気は電気の\"流れ\"ではなく、電荷が物の表面に一時的に\"たまった\"状態です。家の中を常に流れている電気とは違います。",
    "sec2Title": "日常生活で静電気が発生する場面",
    "sec2Sub": "きっと経験したことがあるはずです。",
    "item1Title": "乾燥した天気",
    "item1Sub": "特に冬場",
    "item1Desc": "湿度が低いと、電荷が空気中の水分を伝って\"逃げる\"ことができず、どんどんたまっていきます。冬に静電気が起きやすいのはこのためです。",
    "item2Title": "上着を脱ぐとき",
    "item2Sub": "特に化学繊維の上着",
    "item2Desc": "化学繊維の上着を脱ぐと、生地が体や他の衣類とこすれ合い、電子が移動して体や服に静電気がたまります。",
    "item3Title": "髪をとかすとき",
    "item3Sub": "プラスチックの櫛が特に顕著",
    "item3Desc": "乾いた髪をプラスチックの櫛でとかすと、櫛と髪の間で摩擦が起き、髪の毛が同じ電気を帯びて反発し合い、パチパチと広がって顔や服にくっつきます。",
    "sec3Title": "静電気を防ぐ方法",
    "sec3Sub": "簡単な習慣で、静電気を\"おとなしく\"させられます。",
    "func1Title": "部屋の湿度を上げる",
    "func1Desc": "加湿器を使ったり、部屋に水を張った容器を置いたりすると、空気中の水分が増え、電荷がたまりにくくなります。",
    "func2Title": "まず壁や木製のドアを手のひらで触る",
    "func2Desc": "壁や木製のドアなど電気を通しにくいものに、手のひら全体でゆっくり触れましょう。体にたまった静電気が少しずつ分散して逃げるため、指先で一気に放電することがなくなります。",
    "func3Title": "小さな金属製の物でまず放電する",
    "func3Desc": "金属製のドアノブに触れる前に、鍵や硬貨で先に触れておきましょう。電荷は指ではなく、その金属製の物を通って逃げていきます。",
    "tip2Label": "そのほか：",
    "tip2Text": "化学繊維ではなく綿などの天然素材の服を選ぶと、摩擦による帯電そのものを元から減らせるので、静電気を感じることも少なくなります。",
    "footer": "このページは静電気に関する一般的な知識を紹介するものです。身の回りで目に見えない静電気の現象を理解する助けになれば幸いです。"
  },
  "pt-BR": {
    "title": "Guia do Jogo",
    "navBrand": "Eletricidade Estática 101",
    "tab1": "Como Funciona",
    "tab2": "De Onde Vem",
    "tab3": "Como Evitar",
    "heroEyebrow": "GAME MANUAL · Fundamentos de Eletricista",
    "heroTitle": "Guia do Jogo",
    "heroSub": "Clique em uma aba acima ou role para baixo — um guia simples sobre a eletricidade estática ao seu redor.",
    "sec1Title": "Como Funciona a Eletricidade Estática",
    "sec1Sub": "Tudo é feito de átomos. Dentro de cada átomo, prótons com carga positiva e elétrons com carga negativa normalmente ficam em equilíbrio.",
    "card1Tag": "Atrito",
    "card1Title": "Eletrização por Atrito",
    "card1Desc": "Quando dois materiais diferentes se esfregam, elétrons \"pulam\" de um material para o outro. Quem ganha elétrons fica carregado negativamente, quem perde fica carregado positivamente — é daí que vem a eletricidade estática.",
    "card2Tag": "Atração/Repulsão",
    "card2Title": "Cargas iguais se repelem, cargas opostas se atraem",
    "card2Desc": "Objetos com a mesma carga se repelem, enquanto objetos com cargas opostas se atraem. É por isso que seu cabelo costuma \"voar\" e grudar no rosto ou na roupa no inverno.",
    "tipLabel": "Lembre-se:",
    "tipText": "Eletricidade estática não é uma \"corrente\" — é carga que se acumula temporariamente na superfície de um objeto, diferente da corrente que flui continuamente pelos fios da sua casa.",
    "sec2Title": "De Onde Vem a Eletricidade Estática no Dia a Dia",
    "sec2Sub": "Você com certeza já passou por essas situações.",
    "item1Title": "Tempo seco",
    "item1Sub": "Principalmente no inverno",
    "item1Desc": "Quando a umidade está baixa, a carga não consegue \"escapar\" facilmente pela umidade do ar, então ela se acumula — por isso os choques estáticos são mais comuns no inverno.",
    "item2Title": "Tirar o casaco",
    "item2Sub": "Principalmente tecidos sintéticos",
    "item2Desc": "Ao tirar um casaco sintético, o tecido esfrega no seu corpo e em outras roupas, transferindo elétrons e acumulando estática em você e na roupa.",
    "item3Title": "Pentear o cabelo",
    "item3Sub": "Pentes de plástico são os piores",
    "item3Desc": "Pentear o cabelo seco com um pente de plástico gera atrito entre o pente e o cabelo. Os fios ficam com a mesma carga, se repelem e \"voam\", grudando no rosto ou na roupa.",
    "sec3Title": "Como Evitar a Eletricidade Estática",
    "sec3Sub": "Alguns hábitos simples bastam para manter a eletricidade estática sob controle.",
    "func1Title": "Aumentar a umidade do ar",
    "func1Desc": "Use um umidificador ou deixe uma bacia de água no quarto — mais umidade no ar ajuda a carga a escoar em vez de se acumular.",
    "func2Title": "Tocar primeiro numa parede ou porta de madeira",
    "func2Desc": "Encoste a palma da mão devagar e por uma área ampla numa parede ou porta de madeira (algo que não conduz bem). Isso deixa a carga do corpo se espalhar e liberar aos poucos, em vez de formar uma faísca na ponta do dedo.",
    "func3Title": "Descarregar com um pequeno objeto de metal",
    "func3Desc": "Antes de tocar numa maçaneta de metal, toque nela primeiro com uma chave ou moeda. A carga passa pelo objeto de metal em vez de pelo seu dedo.",
    "tip2Label": "Além disso:",
    "tip2Text": "Usar algodão e outros tecidos naturais em vez de sintéticos reduz a geração de carga por atrito já na origem, então você leva menos choques.",
    "footer": "Esta página traz conhecimento geral sobre eletricidade estática, para ajudar você a entender melhor esse fenômeno invisível ao seu redor."
  },
  "es-LA": {
    "title": "Guía del juego",
    "navBrand": "Electricidad estática 101",
    "tab1": "Cómo funciona",
    "tab2": "De dónde viene",
    "tab3": "Cómo evitarla",
    "heroEyebrow": "GAME MANUAL · Fundamentos de electricista",
    "heroTitle": "Guía del juego",
    "heroSub": "Haz clic en una pestaña arriba o desplázate hacia abajo — una guía sencilla sobre la electricidad estática que te rodea.",
    "sec1Title": "Cómo funciona la electricidad estática",
    "sec1Sub": "Todo está hecho de átomos. Dentro de cada átomo, los protones con carga positiva y los electrones con carga negativa normalmente se equilibran entre sí.",
    "card1Tag": "Fricción",
    "card1Title": "Electrización por fricción",
    "card1Desc": "Cuando dos materiales distintos se frotan entre sí, los electrones \"saltan\" de uno al otro. El que gana electrones queda cargado negativamente, y el que los pierde, positivamente — así se origina la electricidad estática.",
    "card2Tag": "Atracción/repulsión",
    "card2Title": "Las cargas iguales se repelen, las opuestas se atraen",
    "card2Desc": "Los objetos con la misma carga se repelen, y los que tienen cargas opuestas se atraen. Por eso el cabello suele \"volar\" y pegarse a la cara o la ropa en invierno.",
    "tipLabel": "Recuerda:",
    "tipText": "La electricidad estática no es una \"corriente\" — es carga que se acumula temporalmente en la superficie de un objeto, a diferencia de la corriente que fluye constantemente por los cables de tu casa.",
    "sec2Title": "De dónde viene la electricidad estática en la vida diaria",
    "sec2Sub": "Seguro que ya has vivido estas situaciones.",
    "item1Title": "Clima seco",
    "item1Sub": "Sobre todo en invierno",
    "item1Desc": "Cuando la humedad es baja, la carga no puede \"escaparse\" fácilmente a través de la humedad del aire, así que se va acumulando — por eso hay más descargas estáticas en invierno.",
    "item2Title": "Quitarte una chaqueta",
    "item2Sub": "Sobre todo de tela sintética",
    "item2Desc": "Al quitarte una chaqueta sintética, la tela se frota contra tu cuerpo y otra ropa, transfiriendo electrones y acumulando estática en ti y en tu ropa.",
    "item3Title": "Peinarte el cabello",
    "item3Sub": "Los peines de plástico son los peores",
    "item3Desc": "Peinar el cabello seco con un peine de plástico genera fricción entre el peine y el pelo. El cabello queda con la misma carga, se repele entre sí y \"vuela\", pegándose a la cara o la ropa.",
    "sec3Title": "Cómo evitar la electricidad estática",
    "sec3Sub": "Unos cuantos hábitos simples bastan para mantener la estática bajo control.",
    "func1Title": "Aumentar la humedad del aire",
    "func1Desc": "Usa un humidificador, o simplemente deja un recipiente con agua en la habitación — un poco más de humedad ayuda a que la carga se disipe en vez de acumularse.",
    "func2Title": "Tocar primero una pared o puerta de madera",
    "func2Desc": "Apoya la palma de la mano lenta y ampliamente sobre una pared o puerta de madera (algo que no conduce bien). Así la carga de tu cuerpo se dispersa y libera poco a poco, en lugar de saltar como chispa desde la yema del dedo.",
    "func3Title": "Descargar con un objeto metálico pequeño",
    "func3Desc": "Antes de tocar una manija de metal, tócala primero con una llave o una moneda. La carga pasará por el objeto metálico en vez de por tu dedo.",
    "tip2Label": "Además:",
    "tip2Text": "Usar algodón u otras telas naturales en vez de sintéticas reduce la generación de carga por fricción desde el origen, así que recibirás menos descargas.",
    "footer": "Esta página ofrece conocimientos generales sobre la electricidad estática, para ayudarte a entender mejor este fenómeno invisible que te rodea."
  },
  "ko": {
    "title": "게임 가이드",
    "navBrand": "정전기 기초 상식",
    "tab1": "정전기의 원리",
    "tab2": "정전기의 발생",
    "tab3": "예방 방법",
    "heroEyebrow": "GAME MANUAL · 전기공 기초",
    "heroTitle": "게임 가이드",
    "heroSub": "위의 탭을 클릭하거나 아래로 스크롤하세요 — 우리 주변의 정전기를 가장 쉽게 이해하는 방법입니다.",
    "sec1Title": "정전기의 원리",
    "sec1Sub": "모든 물체는 원자로 이루어져 있습니다. 원자 안에서 양전하를 띤 양성자와 음전하를 띤 전자는 평소 균형을 이루고 있습니다.",
    "card1Tag": "마찰",
    "card1Title": "마찰전기",
    "card1Desc": "서로 다른 두 물질이 마찰하면 전자가 한쪽에서 다른 쪽으로 \"이동\"합니다. 전자를 얻은 쪽은 음전하를, 잃은 쪽은 양전하를 띠게 되는데, 이것이 바로 정전기의 원인입니다.",
    "card2Tag": "인력/척력",
    "card2Title": "같은 전하는 밀어내고, 다른 전하는 끌어당긴다",
    "card2Desc": "같은 전하를 띤 물체끼리는 서로 밀어내고, 다른 전하를 띤 물체끼리는 서로 끌어당깁니다. 겨울에 머리카락이 자꾸 날려서 얼굴이나 옷에 달라붙는 것도 이 때문입니다.",
    "tipLabel": "기억하세요:",
    "tipText": "정전기는 전기가 \"흐르는\" 것이 아니라, 전하가 물체 표면에 일시적으로 \"쌓인\" 상태입니다. 집 안 전선에 계속 흐르는 전기와는 다릅니다.",
    "sec2Title": "일상생활에서 정전기가 발생하는 순간",
    "sec2Sub": "아마 누구나 겪어 봤을 상황들입니다.",
    "item1Title": "건조한 날씨",
    "item1Sub": "특히 겨울철",
    "item1Desc": "습도가 낮으면 전하가 공기 중 수분을 통해 쉽게 \"빠져나가지\" 못해 점점 쌓이게 됩니다. 그래서 겨울에 정전기가 더 자주 발생합니다.",
    "item2Title": "겉옷을 벗을 때",
    "item2Sub": "특히 화학섬유 소재",
    "item2Desc": "화학섬유 겉옷을 벗으면 옷감이 몸과 다른 옷에 마찰되면서 전자가 이동해, 몸과 옷에 정전기가 쌓입니다.",
    "item3Title": "머리를 빗을 때",
    "item3Sub": "플라스틱 빗이 특히 심함",
    "item3Desc": "건조한 머리카락을 플라스틱 빗으로 빗으면 빗과 머리카락 사이에 마찰이 일어납니다. 머리카락이 같은 전하를 띠게 되어 서로 밀어내며 흩날려 얼굴이나 옷에 달라붙습니다.",
    "sec3Title": "정전기를 예방하는 방법",
    "sec3Sub": "간단한 습관 몇 가지만으로도 정전기를 \"잠재울\" 수 있습니다.",
    "func1Title": "실내 습도 높이기",
    "func1Desc": "가습기를 사용하거나 방에 물을 담은 그릇을 두면 공기 중 수분이 늘어 전하가 쌓이지 않고 빠져나가기 쉬워집니다.",
    "func2Title": "먼저 손바닥으로 벽이나 나무문 만지기",
    "func2Desc": "벽이나 나무문처럼 전기가 잘 통하지 않는 물체를 손바닥으로 넓게, 천천히 만지세요. 몸에 쌓인 정전기가 서서히 퍼지며 방출되어, 손끝에서 한꺼번에 방전되지 않습니다.",
    "func3Title": "작은 금속 물건으로 미리 방전하기",
    "func3Desc": "금속 문손잡이를 만지기 전에 열쇠나 동전으로 먼저 살짝 대보세요. 전하가 손가락 대신 그 금속 물건을 통해 빠져나갑니다.",
    "tip2Label": "그 밖에:",
    "tip2Text": "화학섬유 대신 순면 등 천연 소재의 옷을 입으면 마찰로 생기는 전하를 근본적으로 줄일 수 있어 정전기를 덜 겪게 됩니다.",
    "footer": "이 페이지는 정전기에 대한 일반 상식을 다루며, 눈에 보이지 않는 정전기 현상을 더 잘 이해하는 데 도움을 드리고자 합니다."
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
  .tip{
    margin-top:20px;background:var(--panel-alt);border-left:3px solid var(--yellow);
    padding:14px 16px;border-radius:0 8px 8px 0;font-size:16px;color:var(--text);
  }
  .tip b{color:var(--yellow);}

  /* ===== ITEM CARDS (section 2) ===== */
  .wire-row{
    display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:flex-start;
    padding:18px;background:var(--panel);border-radius:10px;margin-bottom:14px;border:1px solid var(--line);
  }
  .wire-chip{
    width:54px;height:54px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    background:var(--panel-alt);
    padding:8px;
  }
  .wire-chip svg{width:100%;height:100%;}
  .wire-row h3{margin:2px 0 6px;font-size:19px;}
  .wire-row h3 .cn{color:var(--text-faint);font-weight:400;font-size:14px;margin-left:6px;}
  .wire-row p{margin:0;color:var(--text-muted);font-size:16px;}

  /* ===== SECTION 3 ===== */
  .func-grid{display:flex;flex-direction:column;gap:14px;}
  .func-card{
    background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px 20px;
    display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:flex-start;
  }
  .func-num{
    width:54px;height:54px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    background:var(--panel-alt);color:var(--yellow);
    font-size:22px;font-weight:700;
  }
  .func-card h4{margin:2px 0 6px;font-size:18px;}
  .func-card p{margin:0;color:var(--text);font-size:16px;}

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
        <span class="btn-tag left">${t.card1Tag}</span>
        <h3>${t.card1Title}</h3>
        <p>${t.card1Desc}</p>
      </div>

      <div class="ctrl-card safe">
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
      <div class="wire-chip">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <g id="sun">
            <path style="fill:#ff927d;" d="M37.69,5.1h0a6.33,6.33,0,0,1,11,4.56h0a6.33,6.33,0,0,0,6.64,6.64h0a6.33,6.33,0,0,1,4.56,11h0a6.32,6.32,0,0,0,0,9.38h0a6.33,6.33,0,0,1-4.56,11h0a6.33,6.33,0,0,0-6.64,6.64h0a6.33,6.33,0,0,1-11,4.56h0a6.32,6.32,0,0,0-9.38,0h0a6.33,6.33,0,0,1-11-4.56h0a6.33,6.33,0,0,0-6.64-6.64h0a6.33,6.33,0,0,1-4.56-11h0a6.32,6.32,0,0,0,0-9.38h0a6.33,6.33,0,0,1,4.56-11h0A6.33,6.33,0,0,0,17.3,9.66h0a6.33,6.33,0,0,1,11-4.56h0A6.32,6.32,0,0,0,37.69,5.1Z"/>
            <circle style="fill:#fff35f;stroke:#54596e;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px;" cx="33" cy="32" r="22"/>
            <path style="fill:#54596e;opacity:0.15;" d="M33,48A22,22,0,0,1,11.21,29,22.78,22.78,0,0,0,11,32a22,22,0,0,0,44,0,22.78,22.78,0,0,0-.21-3A22,22,0,0,1,33,48Z"/>
            <circle style="fill:#54596e;" cx="22" cy="23" r="2"/>
            <circle style="fill:#54596e;" cx="44" cy="23" r="2"/>
            <path style="fill:#54596e;" d="M40,31.18c0-1.57-14-1.57-14,0v0C26,33.86,29.13,36,33,36s7-2.14,7-4.79Z"/>
            <ellipse style="fill:#ff927d;" cx="33" cy="33" rx="3" ry="1"/>
          </g>
        </svg>
      </div>
      <div>
        <h3>${t.item1Title}<span class="cn">${t.item1Sub}</span></h3>
        <p>${t.item1Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path style="fill:#0096DC;" d="M123.586,459.034v44.138c0,4.875,3.953,8.828,8.828,8.828h247.172c4.875,0,8.828-3.953,8.828-8.828
	v-44.138H123.586z"/>
          <path style="fill:#00AAF0;" d="M55.203,406.069l-1.41,29.622c-0.332,6.974,3.477,13.49,9.719,16.62l67.063,30.171l1.838-76.413
	H55.203z"/>
          <path style="fill:#0096DC;" d="M130.844,471.32c-14.106-7.637-23.576-22.709-23.576-40.066c0-7.453,1.017-16.991,2.123-25.185
	H91.593c-1.062,8.274-1.981,17.569-1.981,25.185c0,14.582,4.915,27.987,13.08,38.684l27.883,12.544L130.844,471.32z"/>
          <path style="fill:#00AAF0;" d="M463.229,211.864c8.495-45.244,4.633-97.657-11.122-115.955
	c-19.03-22.099-81.348-42.944-81.348-42.944H141.241c0,0-62.318,20.845-81.348,42.944c-15.755,18.297-19.617,70.711-11.122,115.955
	c0,0-13.461,52.963-3.295,97.106c0,0-3.378,49.95-2.259,66.562c1.289,19.134,10.205,35.206,27.18,42.258l37.024,15.064
	c0.821,24.145,19.627,43.836,43.965,43.836h209.227c24.338,0,43.144-19.691,43.965-43.836l37.024-15.064
	c16.975-7.052,25.891-23.124,27.18-42.258c1.119-16.612-2.259-66.562-2.259-66.562C476.69,264.828,463.229,211.864,463.229,211.864z
	"/>
          <g>
            <path style="fill:#0096DC;" d="M399.838,388.412c1.005-2.947,1.844-5.891,2.573-8.825H264.828v-70.621h135.282
		c-1.578-5.542-2.868-8.824-2.868-8.824s1.289-3.285,2.817-8.831H264.828V220.69h135.471c-0.879-2.934-1.878-5.878-3.058-8.825
		c0,0,0-3.774,0-8.83H264.828v-97.103h-17.655v97.103H114.759c0,5.056,0,8.829,0,8.829c-1.178,2.947-2.177,5.891-3.058,8.826
		h135.471v70.621H111.942c1.527,5.546,2.817,8.831,2.817,8.831s-1.29,3.283-2.868,8.824h135.282v70.621H109.589
		c0.729,2.934,1.567,5.878,2.573,8.825c0,0-0.655,3.57-1.481,8.83h136.491v79.448h17.655v-79.448h136.491
		C400.493,391.981,399.838,388.412,399.838,388.412z"/>
            <path style="fill:#0096DC;" d="M141.241,52.966c0,0,61.793,52.966,114.759,61.793c52.966-8.828,114.759-61.793,114.759-61.793
		L349.155,9.76C346.165,3.778,340.052,0,333.364,0H178.636c-6.687,0-12.801,3.778-15.791,9.76L141.241,52.966z"/>
            <path style="fill:#0096DC;" d="M45.476,308.97c0,0-3.378,49.95-2.259,66.562c1.289,19.134,10.205,35.206,27.18,42.258
		l37.024,15.064c-0.019-0.543-0.154-1.054-0.154-1.601c0-16.358,4.895-42.842,4.895-42.842
		c-15.059-44.135,2.596-88.269,2.596-88.269s-17.655-44.141,0-88.277v-35.313c0,0-7.913-47.188-53.356-82.178
		c-0.489,0.513-1.066,1.022-1.51,1.537c-15.755,18.296-19.617,70.71-11.122,115.954C48.771,211.864,35.31,264.828,45.476,308.97z"/>
          </g>
          <path style="fill:#007DC8;" d="M114.759,185.379c0-4.875-3.953-8.828-8.828-8.828c-4.875,0-8.828,3.953-8.828,8.828v23.223
	c-1.736,4.735-3.121,9.449-4.225,14.11l-45.468-18.888c0.414,2.698,0.862,5.384,1.361,8.041c0,0-1.014,4.055-2.269,10.708
	l43.456,18.052c-2.515,26.252,2.851,48.775,6.143,59.477c-1.406,4.473-3.218,11.049-4.728,19.095l-47.701-19.816
	c0.499,3.224,1.076,6.432,1.803,9.589c0,0-0.269,4.006-0.627,10.024l44.117,18.326c-1.233,15.519-0.508,33.745,5.057,52.328
	c-1.263,7.508-3.666,23.073-4.268,36.019l17.666,7.188c-0.019-0.543-0.154-1.053-0.154-1.6l0,0c0-6.134,0.689-13.692,1.549-20.744
	c1.433-11.753,3.346-22.099,3.346-22.099c-15.058-44.137,2.598-88.271,2.598-88.271s-17.655-44.141,0-88.277
	C114.759,211.864,114.759,195.838,114.759,185.379z"/>
          <path style="fill:#00AAF0;" d="M456.797,406.069l1.41,29.622c0.332,6.974-3.477,13.49-9.719,16.62l-67.063,30.171l-1.838-76.413
	H456.797z"/>
          <g>
            <path style="fill:#0096DC;" d="M381.156,471.32c14.106-7.637,23.576-22.709,23.576-40.066c0-7.453-1.017-16.991-2.123-25.185
		h17.798c1.062,8.274,1.981,17.569,1.981,25.185c0,14.582-4.915,27.987-13.08,38.684l-27.883,12.544L381.156,471.32z"/>
            <path style="fill:#0096DC;" d="M466.524,308.97c0,0,3.378,49.95,2.259,66.562c-1.289,19.134-10.205,35.206-27.18,42.258
		l-37.024,15.064c0.019-0.543,0.155-1.054,0.155-1.601c0-16.358-4.895-42.842-4.895-42.842c15.059-44.135-2.596-88.269-2.596-88.269
		s17.655-44.141,0-88.277v-35.313c0,0,7.913-47.188,53.356-82.178c0.489,0.513,1.066,1.022,1.51,1.537
		c15.755,18.296,19.617,70.71,11.122,115.954C463.229,211.864,476.69,264.828,466.524,308.97z"/>
          </g>
          <g>
            <path style="fill:#007DC8;" d="M397.241,185.379c0-4.875,3.953-8.828,8.828-8.828s8.828,3.953,8.828,8.828v23.223
		c1.736,4.735,3.121,9.449,4.225,14.11l45.468-18.888c-0.414,2.698-0.862,5.384-1.361,8.041c0,0,1.014,4.055,2.269,10.708
		l-43.456,18.052c2.515,26.252-2.851,48.775-6.143,59.477c1.406,4.473,3.218,11.049,4.728,19.095l47.701-19.816
		c-0.499,3.224-1.076,6.432-1.803,9.589c0,0,0.269,4.006,0.627,10.024l-44.117,18.326c1.233,15.519,0.508,33.745-5.057,52.328
		c1.263,7.508,3.666,23.073,4.268,36.019l-17.666,7.188c0.019-0.543,0.154-1.053,0.154-1.6l0,0c0-6.134-0.689-13.692-1.549-20.744
		c-1.433-11.753-3.346-22.099-3.346-22.099c15.058-44.137-2.598-88.271-2.598-88.271s17.655-44.141,0-88.277
		C397.241,211.864,397.241,195.838,397.241,185.379z"/>
            <rect x="247.172" y="476.69" style="fill:#007DC8;" width="17.655" height="35.31"/>
            <path style="fill:#007DC8;" d="M342.253,2.463C339.597,0.91,336.558,0,333.364,0H178.636c-3.194,0-6.233,0.91-8.888,2.463
		c24.745,30.644,52.885,53.429,70.097,65.963c4.591,3.343,7.328,8.636,7.328,14.316v30.123c2.959,0.737,5.91,1.407,8.828,1.894
		c2.918-0.486,5.868-1.155,8.828-1.894V82.742c0-5.681,2.737-10.973,7.328-14.317C289.367,55.892,317.507,33.107,342.253,2.463z"/>
          </g>
        </svg>
      </div>
      <div>
        <h3>${t.item2Title}<span class="cn">${t.item2Sub}</span></h3>
        <p>${t.item2Desc}</p>
      </div>
    </div>

    <div class="wire-row">
      <div class="wire-chip">
        <svg viewBox="0 0 511.992 511.992" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path style="fill:#D770AD;" d="M357.994,85.334c0-5.89-4.781-10.664-10.656-10.664H245.746v21.328h101.591
		C353.213,95.998,357.994,91.225,357.994,85.334z"/>
            <path style="fill:#D770AD;" d="M347.338,117.334H245.746v21.336h101.591c5.875,0,10.656-4.773,10.656-10.672
		C357.994,122.107,353.213,117.334,347.338,117.334z"/>
            <path style="fill:#D770AD;" d="M347.338,159.997H245.746l-1.336,21.336h101.583c5.891,0,10.656-4.773,10.656-10.664
		S351.885,159.997,347.338,159.997z"/>
            <path style="fill:#D770AD;" d="M347.338,202.668H245.746v21.335h101.591c5.875,0,10.656-4.781,10.656-10.672
		C357.994,207.442,353.213,202.668,347.338,202.668z"/>
            <path style="fill:#D770AD;" d="M345.994,245.332H244.411v21.336h101.583c5.891,0,10.656-4.773,10.656-10.664
		C356.65,250.105,351.885,245.332,345.994,245.332z"/>
            <path style="fill:#D770AD;" d="M345.994,287.995H244.411v21.344h101.583c5.891,0,10.656-4.781,10.656-10.672
		S351.885,287.995,345.994,287.995z"/>
            <path style="fill:#D770AD;" d="M345.994,330.666H244.411v21.328h101.583c5.891,0,10.656-4.781,10.656-10.656
		C356.65,335.432,351.885,330.666,345.994,330.666z"/>
            <path style="fill:#D770AD;" d="M345.994,373.338H244.411v21.328h101.583c5.891,0,10.656-4.766,10.656-10.672
		C356.65,378.103,351.885,373.338,345.994,373.338z"/>
            <path style="fill:#D770AD;" d="M345.994,415.993H244.411v21.343h101.583c5.891,0,10.656-4.781,10.656-10.672
		C356.65,420.774,351.885,415.993,345.994,415.993z"/>
          </g>
          <path style="fill:#EC87C0;" d="M260.66,458.664V53.335h92.303c0,0,16.844-43.999-21.343-53.335H196.661
	c0,0-42.663,25.734-42.663,256.004c0,230.254,42.663,255.988,42.663,255.988H331.62c38.187-9.328,21.343-53.328,21.343-53.328
	H260.66z"/>
        </svg>
      </div>
      <div>
        <h3>${t.item3Title}<span class="cn">${t.item3Sub}</span></h3>
        <p>${t.item3Desc}</p>
      </div>
    </div>

  </section>

  <!-- ================= SECTION 3 ================= -->
  <section id="sec3">
    <div class="sec-head"><span class="idx mono">03</span><h2>${t.sec3Title}</h2></div>
    <p class="sec-sub">${t.sec3Sub}</p>

    <div class="func-grid">
      <div class="func-card">
        <div class="func-num mono">01</div>
        <div>
          <h4>${t.func1Title}</h4>
          <p>${t.func1Desc}</p>
        </div>
      </div>
      <div class="func-card">
        <div class="func-num mono">02</div>
        <div>
          <h4>${t.func2Title}</h4>
          <p>${t.func2Desc}</p>
        </div>
      </div>
      <div class="func-card">
        <div class="func-num mono">03</div>
        <div>
          <h4>${t.func3Title}</h4>
          <p>${t.func3Desc}</p>
        </div>
      </div>
    </div>

    <div class="tip">
      <b>${t.tip2Label}</b> ${t.tip2Text}
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
