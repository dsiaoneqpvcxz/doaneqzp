const links = [...document.querySelectorAll(".nav-links a")];
const sections = links.map((link) => document.querySelector(link.getAttribute("href")));

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        const active = link.hash === `#${entry.target.id}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  }, { rootMargin: "-20% 0px -55% 0px", threshold: 0 });
  sections.forEach((section) => section && observer.observe(section));
}

const safePlay = (media) => {
  const play = media.play();
  if (play && typeof play.catch === "function") play.catch(() => {});
  return play;
};

const overview = document.querySelector("#overview video");
if (overview) {
  overview.muted = true;
  overview.defaultMuted = true;
  overview.playsInline = true;
  overview.loop = true;
  overview.setAttribute("muted", "");
  overview.setAttribute("playsinline", "");
  overview.setAttribute("loop", "");

  if ("IntersectionObserver" in window) {
    const overviewObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) safePlay(overview);
        else overview.pause();
      }
    }, { threshold: 0.25 });
    overviewObserver.observe(overview);
  } else {
    safePlay(overview);
  }
}

document.querySelectorAll("[data-sync-row]").forEach((row) => {
  const videos = [...row.querySelectorAll("video")];
  const master = row.querySelector("[data-sync-master]") || videos[0];
  if (!master || videos.length < 2) return;

  const followers = videos.filter((video) => video !== master);
  let userPaused = false;
  let visible = false;

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("loop", "");
  });

  const syncToMaster = (force = false) => {
    for (const video of followers) {
      if (force || Math.abs(video.currentTime - master.currentTime) > 0.12) {
        try { video.currentTime = master.currentTime; } catch (_) {}
      }
    }
  };

  const setPlaying = (playing) => {
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    button.textContent = playing ? "Pause" : "Play";
  };

  const playAll = () => {
    userPaused = false;
    const start = () => {
      safePlay(master);
      followers.forEach((video) => {
        try { video.currentTime = master.currentTime; } catch (_) {}
        safePlay(video);
      });
    };

    if (master.readyState >= 2) start();
    else master.addEventListener("loadeddata", start, { once: true });
  };

  const pauseAll = () => {
    master.pause();
    followers.forEach((video) => video.pause());
  };

  const toggle = () => {
    if (master.paused) playAll();
    else {
      userPaused = true;
      pauseAll();
    }
  };

  const button = document.createElement("button");
  button.type = "button";
  button.className = "sync-play";
  button.setAttribute("aria-pressed", "false");
  button.textContent = "Play";
  button.addEventListener("click", toggle);
  row.insertAdjacentElement("afterend", button);

  master.addEventListener("play", () => {
    setPlaying(true);
    followers.forEach((video) => {
      try { video.currentTime = master.currentTime; } catch (_) {}
      safePlay(video);
    });
  });

  master.addEventListener("pause", () => {
    if (!visible || userPaused) setPlaying(false);
    followers.forEach((video) => video.pause());
  });

  master.addEventListener("seeked", () => syncToMaster(true));
  master.addEventListener("timeupdate", () => syncToMaster(false));
  master.addEventListener("ratechange", () => {
    followers.forEach((video) => { video.playbackRate = master.playbackRate; });
  });
  master.addEventListener("ended", () => setPlaying(false));

  videos.forEach((video) => {
    video.addEventListener("click", toggle);
  });

  if ("IntersectionObserver" in window) {
    const rowObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visible = entry.isIntersecting;
        if (visible) {
          if (!userPaused) playAll();
        } else {
          pauseAll();
          userPaused = false;
          setPlaying(false);
        }
      }
    }, { threshold: 0.2, rootMargin: "80px 0px 80px 0px" });
    rowObserver.observe(row);
  } else {
    playAll();
  }
});
