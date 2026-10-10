(() => {
  "use strict";

  // Physical key positions: independent of the operating system keyboard layout.
  const SPEEDS = { Backquote: 0.2, BracketLeft: 0.4, BracketRight: 0.5, Backslash: 0.6 };
  let selectedSpeed = null;
  let scheduled = false;
  let panel;
  let controls;
  let collapsed = false;
  let playbackButton;
  let status;
  let statusText;
  let snail;
  let snailAnimation;
  let inputInfo;
  let lastInput = "Ready · click a speed or press a Spoke key";
  let toast;
  let toastTimer;
  const watched = new WeakSet();

  function player() {
    return document.getElementById("movie_player");
  }

  function video() {
    return player()?.querySelector("video.html5-main-video") ?? null;
  }

  function isAd() {
    const classes = player()?.classList;
    return classes?.contains("ad-showing") || classes?.contains("ad-interrupting");
  }

  function applySpeed() {
    const media = video();
    if (!media || selectedSpeed === null || isAd()) return;
    if (Math.abs(media.playbackRate - selectedSpeed) > 0.001) {
      media.playbackRate = selectedSpeed;
    }
  }

  function refresh() {
    scheduled = false;
    const media = video();
    if (media && !watched.has(media)) {
      watched.add(media);
      for (const type of ["loadedmetadata", "play", "pause", "ended", "ratechange", "emptied"]) {
        media.addEventListener(type, scheduleRefresh);
      }
    }
    applySpeed();
    updatePanel();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(refresh, 0);
  }

  function updatePanel() {
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "snail-spoke-controller";
      panel.setAttribute("aria-label", "Snail playback speed controller");
      panel.style.cssText = "position:fixed;top:20px;right:20px;z-index:2147483647;" +
        "box-sizing:border-box;width:260px;height:108px;padding:10px;" +
        "display:grid;grid-template-rows:28px 30px 16px;gap:6px;" +
        "border:1px solid #80b99a;border-radius:12px;background:#18261f;" +
        "color:#edffed;font:14px/1.5 system-ui,sans-serif;box-shadow:0 4px 24px #0005;" +
        "text-align:left;";
      status = document.createElement("div");
      status.style.cssText = "display:flex;align-items:center;min-width:0;font:600 15px/28px system-ui,sans-serif;color:#edffed;";
      snail = document.createElement("button");
      snail.type = "button";
      snail.textContent = "🐌";
      snail.setAttribute("aria-label", "Shrink Snail controls");
      snail.setAttribute("aria-expanded", "true");
      snail.title = "Shrink controls";
      snail.addEventListener("click", toggleBadge);
      snail.style.cssText = "all:initial;cursor:pointer;text-align:center;display:inline-block;flex:0 0 28px;font-size:23px;line-height:28px;transform-origin:50% 85%;margin-right:6px;";
      statusText = document.createElement("span");
      statusText.setAttribute("role", "status");
      statusText.setAttribute("aria-live", "polite");
      statusText.style.cssText = "min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      status.appendChild(snail);
      status.appendChild(statusText);
      panel.appendChild(status);
      controls = document.createElement("div");
      controls.style.cssText = "display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:0;";
      for (const speed of [0.2, 0.4, 0.5, 0.6]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${speed}×`;
        button.setAttribute("aria-label", `Set speed to ${speed} times`);
        button.style.cssText = "all:initial;cursor:pointer;background:#edffed;color:#18261f;" +
          "box-sizing:border-box;text-align:center;white-space:nowrap;border:1px solid #80b99a;border-radius:6px;padding:0;font:600 12px system-ui;";
        button.addEventListener("click", () => selectSpeed(speed, "Clicked"));
        controls.appendChild(button);
      }
      playbackButton = document.createElement("button");
      playbackButton.type = "button";
      playbackButton.style.cssText = "all:initial;cursor:pointer;background:#edffed;color:#18261f;" +
        "box-sizing:border-box;text-align:center;white-space:nowrap;border:1px solid #80b99a;border-radius:6px;padding:0;font:600 12px system-ui;";
      playbackButton.addEventListener("click", () => togglePlayback("Clicked"));
      controls.appendChild(playbackButton);
      panel.appendChild(controls);
      inputInfo = document.createElement("div");
      inputInfo.style.cssText = "font:11px/16px system-ui,sans-serif;color:#c5dfcd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      panel.appendChild(inputInfo);
    }
    const parent = document.fullscreenElement || document.body;
    if (panel.parentElement !== parent) parent.appendChild(panel);
    const media = video();
    const playbackPaused = !media || media.paused || media.ended;
    const playbackLabel = playbackPaused ? "▶" : "⏸";
    playbackButton.title = playbackPaused ? "Start" : "Pause";
    playbackButton.setAttribute("aria-label", playbackButton.title);
    if (playbackButton.textContent !== playbackLabel) playbackButton.textContent = playbackLabel;
    playbackButton.disabled = !media;
    const message = !media ? "Snail ready · no video found" :
      isAd() ? `Ad playing${selectedSpeed === null ? "" : ` · queued ${selectedSpeed}×`}` :
      ` ${Number(media.playbackRate.toFixed(2))}×${selectedSpeed === null ? " · ready" : " · locked"}`;
    // Avoid triggering the page MutationObserver when the status is unchanged.
    if (statusText.textContent !== message) {
      statusText.textContent = message;
      statusText.title = message;
    }
    if (inputInfo.textContent !== lastInput) {
      inputInfo.textContent = lastInput;
      inputInfo.title = lastInput;
    }
  }

  function toggleBadge() {
    collapsed = !collapsed;
    panel.style.width = collapsed ? "48px" : "260px";
    panel.style.height = collapsed ? "48px" : "108px";
    panel.style.padding = collapsed ? "9px" : "10px";
    panel.style.gridTemplateRows = collapsed ? "28px" : "28px 30px 16px";
    panel.style.gap = collapsed ? "0" : "6px";
    controls.style.display = collapsed ? "none" : "grid";
    inputInfo.style.display = collapsed ? "none" : "block";
    statusText.style.display = collapsed ? "none" : "inline";
    snail.style.marginRight = collapsed ? "0" : "6px";
    snail.title = collapsed ? "Open controls" : "Shrink controls";
    snail.setAttribute("aria-label", collapsed ? "Open Snail controls" : "Shrink Snail controls");
    snail.setAttribute("aria-expanded", String(!collapsed));
  }

  function animateSnail() {
    if (!snail) return;
    snailAnimation?.cancel();
    // A gentle fade gives feedback when the user prefers reduced motion.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const frames = reduced ? [
      { opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }
    ] : [
      { transform: "translate(0, 0) rotate(0deg) scale(1)" },
      { transform: "translate(-1px, 1px) rotate(-5deg) scale(1.03, .97)", offset: 0.2 },
      { transform: "translate(3px, -4px) rotate(6deg) scale(1)", offset: 0.5 },
      { transform: "translate(1px, 0) rotate(-3deg) scale(1)", offset: 0.8 },
      { transform: "translate(0, 0) rotate(0deg) scale(1)" }
    ];
    snailAnimation = snail.animate?.(frames, { duration: 380, iterations: 1, easing: "ease-in-out" });
  }

  function selectSpeed(speed, source) {
    animateSnail();
    lastInput = `${source} → ${speed}×`;
    const media = video();
    if (!media) {
      lastInput = "Open a YouTube video first";
      updatePanel();
      showToast("🐌 Trigger received · no video found");
      return;
    }
    selectedSpeed = speed;
    refresh();
    showToast(`🐌 ${speed}×${isAd() ? " · after ad" : ""}`);
  }

  async function togglePlayback(source) {
    animateSnail();
    const media = video();
    if (!media) {
      lastInput = "Open a YouTube video first";
      updatePanel();
      showToast("🐌 Trigger received · no video found");
      return;
    }
    try {
      if (media.paused || media.ended) {
        await media.play();
      } else {
        media.pause();
      }
      lastInput = `${source} → ${media.paused ? "Paused" : "Playing"}`;
      showToast(`🐌 ${media.paused ? "Paused" : "Playing"} · ${media.playbackRate}×`);
    } catch {
      lastInput = "Playback could not start · try YouTube’s play button";
      showToast("🐌 Could not start playback");
    }
    refresh();
  }

  function showToast(message) {
    if (!toast) {
      toast = document.createElement("div");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.style.cssText = "position:fixed;top:24px;left:50%;transform:translateX(-50%);" +
        "z-index:2147483647;padding:12px 20px;border-radius:12px;background:#18261f;" +
        "color:#edffed;font:600 18px/1.4 system-ui,sans-serif;pointer-events:none;" +
        "box-shadow:0 4px 24px #0005;";
    }
    // Put the message inside the fullscreen element so it remains visible there.
    (document.fullscreenElement || document.body).appendChild(toast);
    toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 1800);
  }

  function isEditing(event) {
    return event.composedPath().some((element) =>
      element instanceof Element && (
        element.matches("input, textarea, select, [role='textbox'], [role='combobox']") ||
        element.isContentEditable
      )
    );
  }

  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        event.isComposing || isEditing(event)) return;
    lastInput = `Key received: ${event.code}`;
    updatePanel();
    const speed = SPEEDS[event.code];
    if (event.code === "KeyK") {
      // Consume YouTube's own K shortcut to avoid toggling twice.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) void togglePlayback(event.code);
      return;
    }
    if (speed === undefined) return;
    const media = video();
    if (!media) {
      selectSpeed(speed, event.code);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;

    selectSpeed(speed, event.code);
  }, true);

  // YouTube replaces video nodes during navigation and toggles player classes
  // around advertisements. Reattach listeners and restore the chosen content rate.
  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.target === player())) {
      scheduleRefresh();
    }
  }).observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ["class"]
  });
  document.addEventListener("yt-navigate-finish", scheduleRefresh);
  document.addEventListener("fullscreenchange", scheduleRefresh);
  refresh();
})();
