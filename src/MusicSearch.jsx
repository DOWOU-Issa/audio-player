import React, { useState } from 'react';

const MusicSearch = ({ onPlayTrack }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Remplacez par votre clé API YouTube
  const YOUTUBE_API_KEY = 'votre cle API youtube';

  const searchMusic = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query + " audio")}&type=video&key=${YOUTUBE_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      setResults(data.items);
    } catch (err) {
      setError('Erreur de recherche: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = (videoId, title, artist) => {
    onPlayTrack({
      id: videoId,
      title: title,
      artist: artist,
      url: `https://www.youtube.com/watch?v=${videoId}`
    });
  };

  return (
    <div className="music-search">
      <form onSubmit={searchMusic} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🎵 Chercher une musique (ex: Daft Punk, DAMSO, etc.)"
          className="search-input"
        />
        <button type="submit" className="search-btn" disabled={isLoading}>
          {isLoading ? '🔍 Recherche...' : '🔍 Chercher'}
        </button>
      </form>
      
      {error && <div className="search-error">{error}</div>}
      
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((item) => (
            <li 
              key={item.id.videoId} 
              onClick={() => playTrack(item.id.videoId, item.snippet.title, item.snippet.channelTitle)}
              className="search-result-item"
            >
              <img 
                src={item.snippet.thumbnails.default.url} 
                alt={item.snippet.title}
                className="result-thumbnail"
              />
              <div className="result-info">
                <div className="result-title">{item.snippet.title}</div>
                <div className="result-artist">{item.snippet.channelTitle}</div>
              </div>
              <button className="play-result-btn">▶️</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MusicSearch;
