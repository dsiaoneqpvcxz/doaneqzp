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
  const loose = row.hasAttribute("data-sync-loose");
  let userPaused = false;
  let visible = false;
  let lastMasterTime = 0;

  const atEnd = (video) =>
    video.ended ||
    (Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.currentTime >= video.duration - 0.08);

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    // Generation followers: no native loop (avoids black flash on wrap).
    // Freeze at last frame until master loops, then restart together.
    const shouldLoop = !loose || video === master;
    video.loop = shouldLoop;
    if (shouldLoop) video.setAttribute("loop", "");
    else video.removeAttribute("loop");
  });

  const syncToMaster = (force = false) => {
    const target = master.currentTime;
    for (const video of followers) {
      const maxT = Number.isFinite(video.duration) && video.duration > 0
        ? Math.max(0, video.duration - 0.05)
        : target;
      const clamped = Math.min(target, maxT);
      if (force || Math.abs(video.currentTime - clamped) > 0.35) {
        try { video.currentTime = clamped; } catch (_) {}
      }
    }
  };

  const restartFollowers = () => {
    followers.forEach((video) => {
      try { video.currentTime = 0; } catch (_) {}
      if (!master.paused && !userPaused) safePlay(video);
    });
  };

  const playFollowers = () => {
    followers.forEach((video) => {
      if (loose) {
        // Don't call play() while frozen at end — that restarts and flashes black.
        if (atEnd(video)) {
          if (master.currentTime < 0.25) {
            try { video.currentTime = 0; } catch (_) {}
            safePlay(video);
          }
          return;
        }
        safePlay(video);
        return;
      }
      const maxT = Number.isFinite(video.duration) && video.duration > 0
        ? Math.max(0, video.duration - 0.05)
        : master.currentTime;
      try { video.currentTime = Math.min(master.currentTime, maxT); } catch (_) {}
      safePlay(video);
    });
  };

  const setPlaying = (playing) => {
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    button.textContent = playing ? "Pause" : "Play";
  };

  const playAll = () => {
    userPaused = false;
    const start = () => {
      safePlay(master);
      playFollowers();
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
    if (!loose) syncToMaster(true);
    playFollowers();
  });

  master.addEventListener("pause", () => {
    if (!visible || userPaused) setPlaying(false);
    followers.forEach((video) => video.pause());
  });

  if (!loose) {
    master.addEventListener("seeked", () => syncToMaster(true));
    master.addEventListener("timeupdate", () => syncToMaster(false));
  } else {
    // Detect master loop wrap → restart shorter followers together.
    master.addEventListener("timeupdate", () => {
      const t = master.currentTime;
      if (lastMasterTime > 0.45 && t < 0.25) restartFollowers();
      lastMasterTime = t;
    });
    followers.forEach((video) => {
      video.addEventListener("ended", () => {
        video.pause();
      });
    });
  }

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
