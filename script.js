(function () {
  const STORAGE_KEYS = {
    wallpaper: "4studios.wallpaper",
    tiles: "4studios.tiles"
  };
  const scroller = document.getElementById("tiles-scroller");
  const newsFeed = document.getElementById("news-feed");
  const customizeTrigger = document.getElementById("customize-trigger");
  const customizePanel = document.getElementById("customize-panel");
  const wallpaperSelect = document.getElementById("wallpaper-select");
  const wallpaperBrowserToggle = document.getElementById("wallpaper-browser-toggle");
  const wallpaperExplorer = document.getElementById("wallpaper-explorer");
  const wallpaperExplorerClose = document.getElementById("wallpaper-explorer-close");
  const wallpaperExplorerGrid = document.getElementById("wallpaper-explorer-grid");
  const wallpaperBrowserName = document.getElementById("wallpaper-browser-name");
  const selectedTileLabel = document.getElementById("selected-tile-label");
  let selectedTile = null;
  let customizeOpen = false;
  let wallpaperExplorerOpen = false;
  let draggedTile = null;
  let draggedRecently = false;
  let wallpaperItems = [
    { name: "Default wallpaper", value: "./imageres/home_page_bg.jpg" }
  ];
  let wallpaperLibraryItems = [];

  if (!scroller) {
    return;
  }

  closeWallpaperExplorer();
  applySavedWallpaper();
  applySavedTileState();
  attachTileSurfaces(document);
  enableTileDragging(document);

  scroller.addEventListener("wheel", function (event) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
  }, { passive: false });

  scroller.addEventListener("click", function (event) {
    const tile = event.target.closest(".start-tile[data-tile-id]");
    if (draggedRecently && tile) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!tile || !customizeOpen) {
      return;
    }

    event.preventDefault();
    selectTile(tile);
  });

  if (customizeTrigger && customizePanel) {
    customizeTrigger.addEventListener("click", function () {
      customizeOpen = !customizeOpen;
      customizePanel.hidden = !customizeOpen;
      customizeTrigger.classList.toggle("is-active", customizeOpen);
      customizeTrigger.setAttribute("aria-expanded", String(customizeOpen));
      if (!customizeOpen) {
        clearSelectedTile();
        closeWallpaperExplorer();
      }
    });
  }

  if (wallpaperSelect) {
    wallpaperSelect.addEventListener("change", function () {
      setWallpaper(wallpaperSelect.value);
    });
    loadWallpapers();
  }

  if (wallpaperBrowserToggle && wallpaperExplorer) {
    wallpaperBrowserToggle.addEventListener("click", function () {
      wallpaperExplorerOpen = !wallpaperExplorerOpen;
      wallpaperExplorer.hidden = !wallpaperExplorerOpen;
      wallpaperBrowserToggle.setAttribute("aria-expanded", String(wallpaperExplorerOpen));
    });
  }

  if (wallpaperExplorerClose && wallpaperExplorer) {
    wallpaperExplorerClose.addEventListener("click", function () {
      closeWallpaperExplorer();
    });
  }

  document.querySelectorAll("[data-size]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!selectedTile) {
        return;
      }
      setTileSize(selectedTile, button.getAttribute("data-size"));
      saveTileState();
    });
  });

  if (newsFeed) {
    loadLiveNews();
  }

  async function loadWallpapers() {
    try {
      const response = await fetch("/api/wallpapers");
      if (!response.ok) {
        throw new Error("Wallpaper request failed");
      }
      const data = await response.json();
      populateWallpaperSelect(data.items || []);
    } catch (error) {
      populateWallpaperSelect([]);
    }
  }

  function populateWallpaperSelect(items) {
    const currentValue = localStorage.getItem(STORAGE_KEYS.wallpaper) || document.body.getAttribute("data-wallpaper");
    wallpaperItems = [{ name: "Default wallpaper", value: "./imageres/home_page_bg.jpg" }];
    wallpaperLibraryItems = [];
    items.forEach(function (item) {
      const option = document.createElement("option");
      option.value = "." + item.path;
      option.textContent = item.name;
      wallpaperSelect.appendChild(option);
      const normalizedItem = {
        name: item.name,
        value: "." + item.path
      };
      wallpaperItems.push(normalizedItem);
      wallpaperLibraryItems.push(normalizedItem);
    });
    wallpaperSelect.value = currentValue || "./imageres/home_page_bg.jpg";
    renderWallpaperExplorer();
  }

  function applySavedWallpaper() {
    const wallpaper = localStorage.getItem(STORAGE_KEYS.wallpaper) || document.body.getAttribute("data-wallpaper");
    setWallpaper(wallpaper, false);
  }

  function setWallpaper(path, persist) {
    const normalizedPath = path || "./imageres/home_page_bg.jpg";
    document.body.style.setProperty("--wallpaper", 'url("' + normalizedPath + '")');
    if (wallpaperSelect) {
      wallpaperSelect.value = normalizedPath;
    }
    updateWallpaperExplorerSelection(normalizedPath);
    if (persist !== false) {
      localStorage.setItem(STORAGE_KEYS.wallpaper, normalizedPath);
    }
  }

  function renderWallpaperExplorer() {
    if (!wallpaperExplorerGrid) {
      return;
    }
    wallpaperExplorerGrid.innerHTML = "";
    wallpaperLibraryItems.forEach(function (item) {
      const tile = document.createElement("button");
      tile.className = "customize-panel__wallpaper-thumb";
      tile.type = "button";
      tile.setAttribute("data-wallpaper-value", item.value);

      const image = document.createElement("img");
      image.src = item.value;
      image.alt = "";

      const caption = document.createElement("span");
      caption.className = "customize-panel__wallpaper-caption";
      caption.textContent = item.name;

      tile.appendChild(image);
      tile.appendChild(caption);
      tile.addEventListener("click", function () {
        setWallpaper(item.value);
        closeWallpaperExplorer();
      });
      wallpaperExplorerGrid.appendChild(tile);
    });
    updateWallpaperExplorerSelection(wallpaperSelect ? wallpaperSelect.value : "./imageres/home_page_bg.jpg");
  }

  function updateWallpaperExplorerSelection(path) {
    const normalizedPath = path || "./imageres/home_page_bg.jpg";
    const currentItem = wallpaperLibraryItems.find(function (item) {
      return item.value === normalizedPath;
    });
    if (wallpaperBrowserName) {
      wallpaperBrowserName.textContent = currentItem ? currentItem.name : "Choose one";
    }
    if (!wallpaperExplorerGrid) {
      return;
    }
    wallpaperExplorerGrid.querySelectorAll(".customize-panel__wallpaper-thumb").forEach(function (thumb) {
      thumb.classList.toggle("is-selected", thumb.getAttribute("data-wallpaper-value") === normalizedPath);
    });
  }

  function closeWallpaperExplorer() {
    wallpaperExplorerOpen = false;
    if (wallpaperExplorer) {
      wallpaperExplorer.hidden = true;
    }
    if (wallpaperBrowserToggle) {
      wallpaperBrowserToggle.setAttribute("aria-expanded", "false");
    }
  }

  async function loadLiveNews() {
    try {
      const response = await fetch("/api/news");
      if (!response.ok) {
        throw new Error("Feed request failed");
      }

      const data = await response.json();
      const articles = (data.items || []).slice(0, 4).map(function (item) {
        return {
          title: item.title || item.source || "News",
          link: item.link || "#",
          source: item.source || "News",
          image: item.image || "",
          size: "wide"
        };
      });

      if (!articles.length) {
        throw new Error("No articles returned");
      }
      renderNewsTiles(articles);
    } catch (error) {
      renderNewsFallback();
    }
  }

  function renderNewsTiles(articles) {
    const paletteClasses = ["tile-color-light-aqua", "tile-color-aqua", "tile-color-sky"];
    newsFeed.innerHTML = "";

    articles.forEach(function (article, index) {
      const tile = document.createElement("a");
      tile.className = "start-tile start-tile--news " + paletteClasses[index % paletteClasses.length];
      tile.href = article.link;
      tile.target = "_blank";
      tile.rel = "noreferrer noopener";
      tile.classList.add("start-tile--large");

      if (article.image) {
        const image = document.createElement("img");
        image.className = "start-tile__news-image";
        image.src = article.image;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        tile.appendChild(image);
      }

      const eyebrow = document.createElement("span");
      eyebrow.className = "start-tile__eyebrow";
      eyebrow.textContent = article.source;

      const title = document.createElement("span");
      title.className = "start-tile__title";
      title.textContent = article.title;

      tile.appendChild(eyebrow);
      tile.appendChild(title);
      newsFeed.appendChild(tile);
    });

    attachTileSurfaces(newsFeed);
  }

  function renderNewsFallback() {
    if (window.location.protocol === "file:") {
      newsFeed.innerHTML = [
        createFallbackTile("News", "Run python server.py for live headlines", "start-tile--large tile-color-light-aqua"),
        createFallbackTile("BBC", "Local server required", "start-tile--large tile-color-aqua"),
        createFallbackTile("BBC", "Local server required", "start-tile--large tile-color-sky"),
        createFallbackTile("BBC", "Local server required", "start-tile--large tile-color-aqua")
      ].join("");
      attachTileSurfaces(newsFeed);
      return;
    }

    newsFeed.innerHTML = [
      createFallbackTile("BBC", "BBC feed unavailable right now", "start-tile--large tile-color-light-aqua"),
      createFallbackTile("BBC", "BBC feed unavailable right now", "start-tile--large tile-color-aqua"),
      createFallbackTile("BBC", "BBC feed unavailable right now", "start-tile--large tile-color-sky"),
      createFallbackTile("News", "Live feeds need another try later", "start-tile--large tile-color-aqua")
    ].join("");
    attachTileSurfaces(newsFeed);
  }

  function createFallbackTile(source, title, className) {
    return '<article class="start-tile start-tile--news ' + className + '">' +
      '<span class="start-tile__eyebrow">' + escapeHtml(source) + '</span>' +
      '<span class="start-tile__title">' + escapeHtml(title) + '</span>' +
      "</article>";
  }

  function selectTile(tile) {
    if (selectedTile) {
      selectedTile.classList.remove("start-tile--selected");
    }
    selectedTile = tile;
    selectedTile.classList.add("start-tile--selected");
    const title = tile.querySelector(".start-tile__title");
    selectedTileLabel.textContent = title ? title.textContent : "Selected tile";
  }

  function clearSelectedTile() {
    if (selectedTile) {
      selectedTile.classList.remove("start-tile--selected");
    }
    selectedTile = null;
    if (selectedTileLabel) {
      selectedTileLabel.textContent = "Click a tile to edit it";
    }
  }

  function setTileSize(tile, size) {
    tile.classList.remove("start-tile--wide", "start-tile--large");
    tile.setAttribute("data-tile", size);
    if (size === "wide") {
      tile.classList.add("start-tile--wide");
    } else if (size === "large") {
      tile.classList.add("start-tile--large");
    }
    updateTileSurface(tile);
  }

  function applySavedTileState() {
    const saved = parseStoredJson(STORAGE_KEYS.tiles);
    if (!saved) {
      return;
    }

    Object.keys(saved).forEach(function (tileId) {
      const tile = document.querySelector('[data-tile-id="' + cssEscape(tileId) + '"]');
      const state = saved[tileId];
      if (!tile || !state) {
        return;
      }

      if (state.size) {
        setTileSize(tile, state.size);
      }
    });

    document.querySelectorAll(".tile-group__grid").forEach(function (grid) {
      const gridId = grid.getAttribute("data-grid-id");
      const tilesForGrid = Object.keys(saved)
        .map(function (tileId) {
          const state = saved[tileId];
          const tile = document.querySelector('[data-tile-id="' + cssEscape(tileId) + '"]');
          return { tile: tile, state: state };
        })
        .filter(function (entry) {
          return entry.tile && entry.state && entry.state.gridId === gridId;
        })
        .sort(function (left, right) {
          return left.state.order - right.state.order;
        });

      tilesForGrid.forEach(function (entry) {
        grid.appendChild(entry.tile);
      });
    });
  }

  function saveTileState() {
    const state = {};
    document.querySelectorAll(".tile-group__grid").forEach(function (grid) {
      const gridId = grid.getAttribute("data-grid-id") || "";
      Array.from(grid.children).forEach(function (tile, index) {
        const tileId = tile.getAttribute("data-tile-id");
        if (!tileId) {
          return;
        }
        state[tileId] = {
          size: getTileSize(tile),
          gridId: gridId,
          order: index
        };
      });
    });
    localStorage.setItem(STORAGE_KEYS.tiles, JSON.stringify(state));
  }

  function getTileSize(tile) {
    if (tile.classList.contains("start-tile--large")) {
      return "large";
    }
    if (tile.classList.contains("start-tile--wide")) {
      return "wide";
    }
    return "small";
  }

  function attachTileSurfaces(root) {
    const tiles = root.querySelectorAll(".start-tile");
    tiles.forEach(function (tile) {
      if (tile.querySelector(".start-tile__surface")) {
        updateTileSurface(tile);
        return;
      }

      const surface = document.createElement("img");
      surface.className = "start-tile__surface";
      surface.alt = "";
      surface.setAttribute("aria-hidden", "true");
      tile.insertBefore(surface, tile.firstChild);
      updateTileSurface(tile);
    });
  }

  function enableTileDragging(root) {
    root.querySelectorAll(".start-tile[data-tile-id]").forEach(function (tile) {
      tile.setAttribute("draggable", "true");

      tile.addEventListener("dragstart", function (event) {
        draggedTile = tile;
        draggedRecently = true;
        tile.classList.add("is-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", tile.getAttribute("data-tile-id") || "");
        }
      });

      tile.addEventListener("dragend", function () {
        tile.classList.remove("is-dragging");
        saveTileState();
        draggedTile = null;
        window.setTimeout(function () {
          draggedRecently = false;
        }, 180);
      });

      tile.addEventListener("dragover", function (event) {
        if (!draggedTile || draggedTile === tile) {
          return;
        }
        event.preventDefault();
        const targetGrid = tile.parentElement;
        if (!targetGrid) {
          return;
        }
        const rect = tile.getBoundingClientRect();
        const beforeTarget = event.clientX < rect.left + (rect.width / 2);
        if (beforeTarget) {
          targetGrid.insertBefore(draggedTile, tile);
        } else {
          targetGrid.insertBefore(draggedTile, tile.nextElementSibling);
        }
      });

      tile.addEventListener("drop", function (event) {
        if (!draggedTile) {
          return;
        }
        event.preventDefault();
        saveTileState();
      });
    });

    root.querySelectorAll(".tile-group__grid").forEach(function (grid) {
      grid.addEventListener("dragover", function (event) {
        if (!draggedTile) {
          return;
        }
        event.preventDefault();
        if (!grid.querySelector(".start-tile[data-tile-id]")) {
          grid.appendChild(draggedTile);
          return;
        }

        const tiles = Array.from(grid.querySelectorAll(".start-tile[data-tile-id]")).filter(function (tile) {
          return tile !== draggedTile;
        });
        if (!tiles.length) {
          grid.appendChild(draggedTile);
          return;
        }

        const lastTile = tiles[tiles.length - 1];
        const lastRect = lastTile.getBoundingClientRect();
        const isRowLayout = grid.classList.contains("tile-group__grid--single-row-6") || grid.classList.contains("tile-group__grid--single-row-5");
        const pastLastTile = isRowLayout
          ? event.clientX > lastRect.right - 16
          : event.clientY > lastRect.bottom - 16;

        if (pastLastTile) {
          grid.appendChild(draggedTile);
        }
      });

      grid.addEventListener("drop", function (event) {
        if (!draggedTile) {
          return;
        }
        event.preventDefault();
        if (!grid.contains(draggedTile)) {
          grid.appendChild(draggedTile);
        }
        saveTileState();
      });
    });
  }

  function updateTileSurface(tile) {
    const surface = tile.querySelector(".start-tile__surface");
    if (!surface) {
      return;
    }
    surface.src = getTileSurfacePath(tile);
  }

  function getTileSurfacePath(tile) {
    if (tile.classList.contains("start-tile--large")) {
      return "./imageres/tile_large.svg";
    }

    if (tile.classList.contains("start-tile--wide")) {
      return "./imageres/tile_wide.svg";
    }

    return "./imageres/tile.svg";
  }

  function parseStoredJson(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/"/g, '\\"');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
