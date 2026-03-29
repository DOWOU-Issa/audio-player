import React, { useEffect, useRef, useState, useCallback } from 'react';
import './style.css';

const AudioPlayer = () => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const iframeRef = useRef(null);
  const animationRef = useRef(null);
  
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  
  // Local media files states
  const [localTracks, setLocalTracks] = useState([]);
  const [isLocalMode, setIsLocalMode] = useState(true);
  const [folderName, setFolderName] = useState('No folder selected');
  const [currentMediaType, setCurrentMediaType] = useState('audio');
  const [extractingAudio, setExtractingAudio] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // YouTube mode states
  const [isYouTubeMode, setIsYouTubeMode] = useState(false);
  const [currentYouTubeId, setCurrentYouTubeId] = useState('');
  const [currentYouTubeTitle, setCurrentYouTubeTitle] = useState('');
  const [currentYouTubeArtist, setCurrentYouTubeArtist] = useState('');
  const [showYouTubePlayer, setShowYouTubePlayer] = useState(false);
  const [youTubePlayer, setYouTubePlayer] = useState(null);
  const [youTubeVolume, setYouTubeVolume] = useState(100);

  // Formats supportés
  const SUPPORTED_FORMATS = {
    audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'webm', '3gp'],
    video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv']
  };
  
  const ALL_SUPPORTED_EXTENSIONS = [...SUPPORTED_FORMATS.audio, ...SUPPORTED_FORMATS.video];

  // Default tracks (fallback)
  const defaultTracks = [
    { title: "Minimum ca", artist: "inconnu", src: "/Minimum_ca.mp3", type: "audio", isExtracted: false, fileSize: null },
    { title: "Agneterepopi", artist: "Coni", src: "/Agnaterepopi.mp3", type: "audio", isExtracted: false, fileSize: null },
    { title: "Motivation sport", artist: "Art", src: "/motivation.mp3", type: "audio", isExtracted: false, fileSize: null },
    { title: "HOTEL LOBBY COLORS SHOW", artist: "Quavo/Takeoff", src: "/HOTEL_LOBBY.mp3", type: "audio", isExtracted: false, fileSize: null },
    { title: "Graine de sablier", artist: "DAMSO", src: "/Graine_de_sablier.mp3", type: "audio", isExtracted: false, fileSize: null },
    { title: "Une ame pour deux", artist: "DAMSO", src: "/Une_ame_pour_deux.mp3", type: "audio", isExtracted: false, fileSize: null },
    { title: "Dieu ne ment jamais", artist: "DAMSO", src: "/Dieu_ne_ment_jamais.mp3", type: "audio", isExtracted: false, fileSize: null }
  ];

  const tracks = localTracks.length > 0 ? localTracks : defaultTracks;

  // YouTube API Key
  const YOUTUBE_API_KEY = 'Votre cle API youtube ';

  const formatTime = (time) => {
    if (isNaN(time) || !time || time === Infinity) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Détecter le type de média
  const detectMediaType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (SUPPORTED_FORMATS.video.includes(ext)) return 'video';
    return 'audio';
  };

  // Obtenir l'icône
  const getMediaIcon = (type, isExtracted = false) => {
    if (isExtracted) return '🎧';
    return type === 'video' ? '🎬' : '🎵';
  };

  // Extraire l'audio d'une vidéo - VERSION SIMPLIFIÉE ET FONCTIONNELLE
  const extractAudioFromVideo = async (videoFile, track) => {
    return new Promise((resolve, reject) => {
      setExtractingAudio(true);
      setExtractProgress(0);
      
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
      let mediaRecorder = null;
      let chunks = [];
      let progressInterval = null;
      let timeoutId = null;
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        
        // Créer un contexte audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        // Configurer le MediaRecorder pour capturer l'audio
        mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/mp3') ? 'audio/mp3' : 'audio/webm'
        });
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          // Nettoyer les timers et intervalles
          if (progressInterval) clearInterval(progressInterval);
          if (timeoutId) clearTimeout(timeoutId);
          
          // Créer le blob audio
          const mimeType = MediaRecorder.isTypeSupported('audio/mp3') ? 'audio/mp3' : 'audio/webm';
          const audioBlob = new Blob(chunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Nettoyer
          URL.revokeObjectURL(video.src);
          audioContext.close();
          
          resolve({
            title: track.title,
            artist: track.artist,
            src: audioUrl,
            blob: audioBlob,
            type: 'audio',
            isExtracted: true,
            originalFile: videoFile,
            fileSize: audioBlob.size
          });
          
          setExtractingAudio(false);
          setExtractProgress(0);
        };
        
        // Démarrer l'enregistrement
        mediaRecorder.start(1000); // Collecter des chunks toutes les secondes
        
        // Jouer la vidéo (mute pour ne pas entendre)
        video.muted = true;
        video.play();
        
        // Mettre à jour la progression
        progressInterval = setInterval(() => {
          if (video.currentTime) {
            const percent = (video.currentTime / duration) * 100;
            setExtractProgress(Math.min(percent, 100));
          }
        }, 100);
        
        // Arrêter l'enregistrement après la durée de la vidéo
        timeoutId = setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          video.pause();
          video.currentTime = 0;
        }, duration * 1000);
      };
      
      video.onerror = () => {
        if (progressInterval) clearInterval(progressInterval);
        if (timeoutId) clearTimeout(timeoutId);
        setExtractingAudio(false);
        reject(new Error('Error loading video'));
      };
    });
  };

  // Extraire l'audio pour un fichier vidéo
  const handleExtractAudio = async (trackIndex) => {
    const track = localTracks[trackIndex];
    if (track.type !== 'video' || track.isExtracted) return;
    
    try {
      const extractedTrack = await extractAudioFromVideo(track.file, track);
      
      // Ajouter la piste extraite à la playlist
      const newTracks = [...localTracks];
      newTracks.splice(trackIndex + 1, 0, extractedTrack);
      setLocalTracks(newTracks);
      
      // Demander le téléchargement
      const userConfirmed = window.confirm(
        `✅ Audio extracted successfully!\n\n📁 ${track.title}\n📦 Size: ${formatFileSize(extractedTrack.fileSize)}\n\nDo you want to download it?`
      );
      
      if (userConfirmed) {
        const a = document.createElement('a');
        a.href = extractedTrack.src;
        a.download = `${track.title}_extracted_audio.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Error extracting audio. Please try again.');
      setExtractingAudio(false);
      setExtractProgress(0);
    }
  };

  // Télécharger une piste existante
  const handleDownloadTrack = (track) => {
    if (track.src) {
      const a = document.createElement('a');
      a.href = track.src;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert('This track cannot be downloaded directly.');
    }
  };

  // Fonction pour charger un dossier de médias
  const handleFolderSelect = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.directory = true;
      input.multiple = true;
      
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const mediaFiles = files.filter(file => {
          const ext = file.name.split('.').pop().toLowerCase();
          return ALL_SUPPORTED_EXTENSIONS.includes(ext);
        });
        
        if (mediaFiles.length === 0) {
          alert(`No supported media files found.\n\nSupported formats:\nAudio: ${SUPPORTED_FORMATS.audio.join(', ')}\nVideo: ${SUPPORTED_FORMATS.video.join(', ')}`);
          return;
        }
        
        const newTracks = mediaFiles.map((file, index) => {
          const mediaType = detectMediaType(file.name);
          return {
            id: index,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: mediaType === 'video' ? "Video File" : "Audio File",
            src: URL.createObjectURL(file),
            file: file,
            type: mediaType,
            isExtracted: false,
            fileSize: file.size
          };
        });
        
        setLocalTracks(newTracks);
        setCurrentTrackIndex(0);
        setIsLocalMode(true);
        setIsYouTubeMode(false);
        setShowYouTubePlayer(false);
        setCurrentMediaType(newTracks[0]?.type || 'audio');
        setFolderName(mediaFiles[0]?.webkitRelativePath?.split('/')[0] || 'Selected Folder');
        
        if (audioRef.current && newTracks[0]) {
          audioRef.current.src = newTracks[0].src;
          audioRef.current.load();
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Error selecting folder. Please try again.');
    }
  };

  // Fonction pour charger des fichiers individuels
  const handleFileSelect = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ALL_SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(',');
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      const mediaFiles = files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ALL_SUPPORTED_EXTENSIONS.includes(ext);
      });
      
      if (mediaFiles.length === 0) {
        alert(`Please select supported media files.\n\nSupported formats:\nAudio: ${SUPPORTED_FORMATS.audio.join(', ')}\nVideo: ${SUPPORTED_FORMATS.video.join(', ')}`);
        return;
      }
      
      const newTracks = mediaFiles.map((file, index) => {
        const mediaType = detectMediaType(file.name);
        return {
          id: index,
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: mediaType === 'video' ? "Video File" : "Audio File",
          src: URL.createObjectURL(file),
          file: file,
          type: mediaType,
          isExtracted: false,
          fileSize: file.size
        };
      });
      
      setLocalTracks(newTracks);
      setCurrentTrackIndex(0);
      setIsLocalMode(true);
      setIsYouTubeMode(false);
      setShowYouTubePlayer(false);
      setCurrentMediaType(newTracks[0]?.type || 'audio');
      setFolderName(`${mediaFiles.length} file(s) selected`);
      
      if (audioRef.current && newTracks[0]) {
        audioRef.current.src = newTracks[0].src;
        audioRef.current.load();
      }
    };
    
    input.click();
  };

  // Nettoyer les URLs
  useEffect(() => {
    return () => {
      localTracks.forEach(track => {
        if (track.src && track.src.startsWith('blob:')) {
          URL.revokeObjectURL(track.src);
        }
      });
    };
  }, [localTracks]);

  const nextTrack = useCallback(() => {
    if (isYouTubeMode) return;
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(randomIndex);
      setCurrentMediaType(tracks[randomIndex]?.type || 'audio');
    } else {
      const newIndex = (currentTrackIndex + 1 < tracks.length ? currentTrackIndex + 1 : 0);
      setCurrentTrackIndex(newIndex);
      setCurrentMediaType(tracks[newIndex]?.type || 'audio');
    }
  }, [shuffle, tracks.length, isYouTubeMode, currentTrackIndex]);

  const prevTrack = useCallback(() => {
    if (isYouTubeMode) return;
    const newIndex = (currentTrackIndex - 1 >= 0 ? currentTrackIndex - 1 : tracks.length - 1);
    setCurrentTrackIndex(newIndex);
    setCurrentMediaType(tracks[newIndex]?.type || 'audio');
  }, [tracks.length, isYouTubeMode, currentTrackIndex]);

  const togglePlay = () => {
    if (isYouTubeMode && youTubePlayer) {
      if (isPlaying) {
        youTubePlayer.pauseVideo();
        setIsPlaying(false);
      } else {
        youTubePlayer.playVideo();
        setIsPlaying(true);
      }
    } else if (!isYouTubeMode && audioRef.current) {
      const audio = audioRef.current;
      if (audio.paused) {
        audio.play().catch(() => {});
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (isYouTubeMode && youTubePlayer) {
      youTubePlayer.setVolume(newVolume * 100);
      setYouTubeVolume(newVolume * 100);
    } else if (!isYouTubeMode && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handlePlaybackRateChange = (e) => {
    const rate = parseFloat(e.target.value);
    if (isYouTubeMode && youTubePlayer) {
      youTubePlayer.setPlaybackRate(rate);
    } else if (!isYouTubeMode && audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const closeYouTubePlayer = () => {
    if (youTubePlayer) {
      try {
        youTubePlayer.stopVideo();
        youTubePlayer.destroy();
      } catch(e) {}
    }
    setShowYouTubePlayer(false);
    setIsYouTubeMode(false);
    setIsPlaying(false);
    setCurrentYouTubeId('');
    setYouTubePlayer(null);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current && localTracks[currentTrackIndex]) {
      audioRef.current.src = localTracks[currentTrackIndex].src;
      audioRef.current.load();
    }
  };

  const searchYouTubeMusic = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setShowSearchResults(true);

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(searchQuery + " music")}&type=video&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
      } else {
        setSearchError('No results found');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Search error. Please check your YouTube API key.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const playYouTubeTrack = (videoId, title, channelTitle) => {
    if (youTubePlayer) {
      try {
        youTubePlayer.destroy();
      } catch(e) {}
    }
    
    setCurrentYouTubeTitle(title);
    setCurrentYouTubeArtist(channelTitle);
    setCurrentYouTubeId(videoId);
    setIsYouTubeMode(true);
    setShowYouTubePlayer(true);
    setIsLocalMode(false);
    setProgress(0);
    setCurrentTime(0);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const onYouTubePlayerReady = (event) => {
    const player = event.target;
    setYouTubePlayer(player);
    player.setVolume(youTubeVolume);
    
    const dur = player.getDuration();
    setDuration(dur);
    
    const updateTime = setInterval(() => {
      if (player && player.getCurrentTime) {
        const current = player.getCurrentTime();
        const dur = player.getDuration();
        if (current && dur) {
          setCurrentTime(current);
          setProgress((current / dur) * 100);
        }
      }
    }, 500);
    
    player.addEventListener('onStateChange', (e) => {
      if (e.data === YT.PlayerState.PLAYING) {
        setIsPlaying(true);
      } else if (e.data === YT.PlayerState.PAUSED) {
        setIsPlaying(false);
      } else if (e.data === YT.PlayerState.ENDED) {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        clearInterval(updateTime);
      }
    });
    
    player.playVideo();
  };

  const seekTo = (e) => {
    if (youTubePlayer && duration) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const newTime = (clickX / width) * duration;
      youTubePlayer.seekTo(newTime, true);
      setCurrentTime(newTime);
      setProgress((newTime / duration) * 100);
    }
  };

  const handleLocalProgressClick = (e) => {
    if (!isYouTubeMode && audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const newTime = (clickX / width) * duration;
      audioRef.current.currentTime = newTime;
    }
  };

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    window.onYouTubeIframeAPIReady = () => {};
  }, []);

  useEffect(() => {
    if (showYouTubePlayer && currentYouTubeId && window.YT && window.YT.Player && iframeRef.current) {
      setTimeout(() => {
        if (iframeRef.current && !youTubePlayer) {
          new window.YT.Player(iframeRef.current, {
            videoId: currentYouTubeId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              showinfo: 0
            },
            events: {
              onReady: onYouTubePlayerReady
            }
          });
        }
      }, 100);
    }
  }, [showYouTubePlayer, currentYouTubeId]);

  useEffect(() => {
    if (!isYouTubeMode && audioRef.current && tracks[currentTrackIndex]) {
      const audio = audioRef.current;
      audio.src = tracks[currentTrackIndex].src;
      audio.load();
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    }
  }, [currentTrackIndex, isYouTubeMode, tracks]);

  useEffect(() => {
    if (!isYouTubeMode) {
      const audio = audioRef.current;
      if (!audio) return;

      const updateProgress = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setCurrentTime(audio.currentTime);
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      
      const setAudioDuration = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      
      const handleTrackEnd = () => {
        if (repeat) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          nextTrack();
        }
      };
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', setAudioDuration);
      audio.addEventListener('ended', handleTrackEnd);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.volume = volume;

      return () => {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('loadedmetadata', setAudioDuration);
        audio.removeEventListener('ended', handleTrackEnd);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }
  }, [isYouTubeMode, repeat, nextTrack, volume, tracks, currentTrackIndex]);

  // Visualizer effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId = null;
    let isDrawing = true;

    const drawAnimatedBars = () => {
      if (!isDrawing) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 40;
      const barWidth = canvas.width / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (Math.sin(Date.now() * 0.005 + i * 0.3) + 1) * 30 + 10;
        const hue = (Date.now() * 0.5 + i * 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
      }
      
      animationId = requestAnimationFrame(drawAnimatedBars);
    };

    drawAnimatedBars();

    return () => {
      isDrawing = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  // Background animation effect
  useEffect(() => {
    const background = document.body;
    let intensity = 0;
    let increasing = true;

    const animateBackground = () => {
      if (increasing) {
        intensity += 0.005;
        if (intensity >= 1) increasing = false;
      } else {
        intensity -= 0.005;
        if (intensity <= 0.3) increasing = true;
      }
      
      background.style.background = `linear-gradient(-45deg, 
        rgb(10, 10, 10) 0%, 
        rgb(${Math.floor(26 + intensity * 30)}, ${Math.floor(10 + intensity * 20)}, ${Math.floor(46 + intensity * 40)}) 25%, 
        rgb(${Math.floor(22 + intensity * 25)}, ${Math.floor(33 + intensity * 35)}, ${Math.floor(62 + intensity * 50)}) 50%, 
        rgb(${Math.floor(45 + intensity * 40)}, ${Math.floor(27 + intensity * 30)}, ${Math.floor(105 + intensity * 60)}) 75%, 
        rgb(15, 15, 35) 100%)`;
      background.style.backgroundSize = '400% 400%';
      
      animationRef.current = requestAnimationFrame(animateBackground);
    };

    animateBackground();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const currentTitle = isYouTubeMode ? currentYouTubeTitle : (tracks[currentTrackIndex]?.title || "");
  const currentArtist = isYouTubeMode ? currentYouTubeArtist : (tracks[currentTrackIndex]?.artist || "");
  const currentType = isYouTubeMode ? 'video' : (tracks[currentTrackIndex]?.type || 'audio');
  const mediaIcon = isYouTubeMode ? '🎬' : getMediaIcon(currentType, tracks[currentTrackIndex]?.isExtracted);

  return (
    <div className="app-container">
      {/* Barre de progression d'extraction */}
      {extractingAudio && (
        <div className="extraction-progress">
          <div className="extraction-bar">
            <div className="extraction-fill" style={{ width: `${extractProgress}%` }}></div>
          </div>
          <span>🎧 Extracting audio... {Math.round(extractProgress)}%</span>
        </div>
      )}

      {/* YouTube Popup */}
      {showYouTubePlayer && (
        <div className="youtube-side-popup">
          <div className="youtube-popup-header">
            <div className="youtube-popup-title">
              <span>🎵 YouTube Music</span>
              <span className="youtube-badge">Playing</span>
            </div>
            <button className="close-popup-btn" onClick={closeYouTubePlayer}>✕</button>
          </div>
          <div className="youtube-popup-content">
            <div className="youtube-track-info">
              <div className="youtube-track-title">{currentYouTubeTitle.substring(0, 50)}</div>
              <div className="youtube-track-artist">{currentYouTubeArtist}</div>
            </div>
            <div className="youtube-player-wrapper">
              <div id="youtube-player" ref={iframeRef} style={{ width: '100%', height: '180px', backgroundColor: '#000', borderRadius: '12px' }}></div>
            </div>
            <div className="youtube-controls">
              <div className="youtube-progress-info">
                <span>{formatTime(currentTime)}</span>
                <div className="youtube-progress" onClick={seekTo}>
                  <div className="youtube-progress-filled" style={{ width: `${progress || 0}%` }}></div>
                </div>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="youtube-buttons">
                <button className="youtube-play-btn" onClick={togglePlay}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button className="youtube-close-btn" onClick={closeYouTubePlayer}>
                  ⏹️ Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lecteur Audio Principal */}
      <div className="audio-player">
        {/* Section Dossier Local */}
        <div className="folder-section">
          <div className="folder-buttons">
            <button className="folder-btn" onClick={handleFolderSelect}>
              📁 Select Media Folder
            </button>
            <button className="folder-btn" onClick={handleFileSelect}>
              🎬 Select Media Files
            </button>
          </div>
          {localTracks.length > 0 && (
            <div className="folder-info">
              <span className="folder-name">📂 {folderName}</span>
              <span className="track-count">
                {localTracks.filter(t => t.type === 'audio' && !t.isExtracted).length} 🎵 audio • 
                {localTracks.filter(t => t.type === 'video').length} 🎬 video • 
                {localTracks.filter(t => t.isExtracted).length} 🎧 extracted
              </span>
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="search-section">
          <form onSubmit={searchYouTubeMusic} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search music on YouTube..."
              className="search-input"
            />
            <button type="submit" className="search-btn" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          {searchError && <div className="search-error">{searchError}</div>}
          
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results-container">
              <div className="search-results-header">
                <span>YouTube Results</span>
                <button className="close-results-btn" onClick={() => setShowSearchResults(false)}>✕</button>
              </div>
              <ul className="search-results">
                {searchResults.map((item, idx) => (
                  <li 
                    key={item.id.videoId || idx}
                    onClick={() => playYouTubeTrack(item.id.videoId, item.snippet.title, item.snippet.channelTitle)}
                    className="search-result-item"
                  >
                    <img src={item.snippet.thumbnails.default.url} alt={item.snippet.title} className="result-thumbnail" />
                    <div className="result-info">
                      <div className="result-title">{item.snippet.title.substring(0, 50)}</div>
                      <div className="result-artist">{item.snippet.channelTitle}</div>
                    </div>
                    <button className="play-result-btn">▶️</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Track Info avec icône de type */}
        <div className="track-info">
          <h1 className="track-title">
            <span className="media-type-icon">{mediaIcon}</span> {currentTitle.substring(0, 60)}
          </h1>
          <p className="track-artist">{currentArtist}</p>
        </div>

        {/* Audio element */}
        <audio ref={audioRef} />

        {/* Visualizer */}
        <canvas ref={canvasRef} width={600} height={120} className="waveform" />

        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress" onClick={isYouTubeMode ? seekTo : handleLocalProgressClick}>
            <div className="progress-filled" style={{ width: `${progress || 0}%` }}></div>
          </div>
          <div className="time-info">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="controls">
          <button className="control-btn" onClick={prevTrack} disabled={isYouTubeMode}>
            <span>⏮</span>
          </button>
          <button className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
            <span>{isPlaying ? '⏸' : '▶'}</span>
          </button>
          <button className="control-btn" onClick={nextTrack} disabled={isYouTubeMode}>
            <span>⏭</span>
          </button>
        </div>

        {/* Options */}
        <div className="options">
          <div className="option-group">
            <button onClick={() => !isYouTubeMode && setShuffle(!shuffle)} className={`option-btn ${shuffle ? 'active' : ''}`} disabled={isYouTubeMode}>
              <span>🔀</span> Shuffle
            </button>
            <button onClick={() => !isYouTubeMode && setRepeat(!repeat)} className={`option-btn ${repeat ? 'active' : ''}`} disabled={isYouTubeMode}>
              <span>🔁</span> Repeat
            </button>
          </div>

          <div className="option-group">
            <select 
              className="speed-selector" 
              value={isYouTubeMode ? (youTubePlayer?.getPlaybackRate() || 1) : (audioRef.current?.playbackRate || 1)} 
              onChange={handlePlaybackRateChange}
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>

            <div className="volume-control">
              <span className="volume-icon">🔊</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={handleVolumeChange} 
                className="volume-slider" 
              />
            </div>
          </div>
        </div>

        {/* Playlist avec boutons d'extraction et de téléchargement */}
        {!isYouTubeMode && tracks.length > 0 && (
          <ul className="playlist">
            {tracks.map((track, index) => (
              <li
                key={track.id || index}
                className={index === currentTrackIndex ? 'active' : ''}
              >
                <span className="playlist-icon" onClick={() => setCurrentTrackIndex(index)}>
                  {getMediaIcon(track.type, track.isExtracted)}
                </span>
                <span className="playlist-title" onClick={() => setCurrentTrackIndex(index)}>
                  {track.title}
                </span>
                <span className="playlist-artist" onClick={() => setCurrentTrackIndex(index)}>
                  {track.artist}
                </span>
                {track.type === 'video' && !track.isExtracted && (
                  <button 
                    className="extract-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExtractAudio(index);
                    }}
                    title="Extract audio from this video"
                  >
                    🎧 Extract Audio
                  </button>
                )}
                {track.isExtracted && (
                  <>
                    <button 
                      className="download-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadTrack(track);
                      }}
                      title="Download extracted audio"
                    >
                      💾 Download
                    </button>
                    <span className="extracted-badge" title="Audio extracted from video">
                      🎧 Extracted
                    </span>
                  </>
                )}
                {track.fileSize && (
                  <span className="file-size">{formatFileSize(track.fileSize)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
