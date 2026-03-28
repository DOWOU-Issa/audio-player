import React, { useState, useEffect } from 'react';

const AudioControls = ({ audioRef, onNext, onPrev, isPlaying, onTogglePlay }) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);


  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = previousVolume;
        setVolume(previousVolume);
        setIsMuted(false);
      } else {
        setPreviousVolume(volume);
        audioRef.current.volume = 0;
        setVolume(0);
        setIsMuted(true);
      }
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration, 
        audioRef.current.currentTime + 10
      );
    }
  };

  // Synchroniser le volume avec l'élément audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioRef]);

  return (
    <div className="dj-controls">
      {/* Contrôles principaux */}
      <div className="main-controls">
        <button className="control-btn secondary" onClick={onPrev} title="Previous Track">
          ⏮️
        </button>
        
        <button className="control-btn secondary" onClick={skipBackward} title="Skip -10s">
          ⏪
        </button>
        
        <button className="control-btn play-btn" onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button className="control-btn secondary" onClick={skipForward} title="Skip +10s">
          ⏩
        </button>
        
        <button className="control-btn secondary" onClick={onNext} title="Next Track">
          ⏭️
        </button>
      </div>

      {/* Contrôles de volume avec style DJ */}
      <div className="volume-controls">
        <button className="volume-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? '🔇' : volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
        </button>
        
        <div className="volume-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="dj-volume-slider"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
          <div className="volume-indicator">
            <div 
              className="volume-fill" 
              style={{ width: `${volume * 100}%` }}
            ></div>
          </div>
        </div>
        
        <span className="volume-display">{Math.round(volume * 100)}%</span>
      </div>

      {/* Égaliseur visuel pour les contrôles */}
      <div className="control-equalizer">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className={`eq-bar-small ${isPlaying ? 'playing' : ''}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default AudioControls;
