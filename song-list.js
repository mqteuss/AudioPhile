// song-list.js — versão automática para GitHub Pages
// Carrega músicas diretamente da pasta /Musics sem precisar selecionar manualmente.

const SongManager = {
  db: null,
  songs: [],

  async init() {
    await this.initDB();
    await this.loadSongsFromDB();

    // Se ainda não houver músicas salvas, busca automaticamente da pasta Musics/
    if (this.songs.length === 0) {
      console.log("🔎 Nenhuma música no banco. Buscando da pasta /Musics...");
      await this.loadFromServerFolder();
    }
  },

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AudioPhileDB', 2);
      request.onerror = () => reject("Erro ao abrir o DB");
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  readAudioMetadata(file) {
    return new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          const { title, artist, picture } = tag.tags;
          let coverUrl = null;
          if (picture) {
            const base64String = btoa(String.fromCharCode.apply(null, picture.data));
            coverUrl = `data:${picture.format};base64,${base64String}`;
          }
          resolve({
            title: title || file.name.replace(/\.[^/.]+$/, ""),
            artist: artist || "Artista Desconhecido",
            coverUrl
          });
        },
        onError: () => {
          resolve({
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Artista Desconhecido",
            coverUrl: null
          });
        }
      });
    });
  },

  async saveSongToDB(song) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['songs'], 'readwrite');
      const store = transaction.objectStore('songs');
      const request = store.add(song);
      request.onsuccess = resolve;
      request.onerror = reject;
    });
  },

  async loadSongsFromDB() {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['songs'], 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.getAll();
      request.onsuccess = (event) => {
        this.songs = event.target.result;
        this.renderSongList();
        resolve(this.songs);
      };
      request.onerror = reject;
    });
  },

  // 🚀 Carrega músicas diretamente do servidor (GitHub Pages)
  async loadFromServerFolder() {
    try {
      // 🔧 Lista manual (você deve atualizar esta lista com os nomes reais)
      const musicFiles = [
        "Musics/Arctic Monkeys - 505.mp3",
        "Musics/Daft Punk - Get Lucky.mp3",
        "Musics/Queen - Bohemian Rhapsody.mp3"
      ];

      for (const path of musicFiles) {
        const response = await fetch(path);
        if (!response.ok) continue;

        const blob = await response.blob();
        const file = new File([blob], path.split('/').pop(), { type: blob.type });

        const metadata = await this.readAudioMetadata(file);
        const song = { file, ...metadata };
        await this.saveSongToDB(song);
      }

      await this.loadSongsFromDB();
      console.log("🎶 Músicas carregadas automaticamente da pasta /Musics!");
    } catch (error) {
      console.error("Erro ao carregar músicas do servidor:", error);
    }
  },

  renderSongList() {
    const container = document.getElementById('song-list');
    const emptyState = document.getElementById('library-empty-state');
    const template = document.getElementById('song-item-template');

    container.innerHTML = '';
    if (!this.songs || this.songs.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    const fragment = document.createDocumentFragment();

    this.songs.forEach(song => {
      const item = template.content.cloneNode(true);
      const li = item.querySelector('.song-item');
      li.dataset.songId = song.id;
      item.querySelector('.song-cover').src = song.coverUrl || 'https://placehold.co/100x100/27272a/3f3f46?text=?';
      item.querySelector('.song-title').textContent = song.title;
      item.querySelector('.song-artist').textContent = song.artist || 'Artista Desconhecido';
      fragment.appendChild(item);
    });

    container.appendChild(fragment);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SongManager.init();
});