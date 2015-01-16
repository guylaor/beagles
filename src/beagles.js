var beagles=typeof beagles==='object' ? beagles:{};

beagles = new function() {
	
	var config = {
		autoplay: true, 			// try to auto start play
		logging:false, 				// default looging to false
		continuePrecent:100,		// start next play with current audio src reached this number
		minItemsInPlaylist: 2, 		// minimum items in playlist, when player goes under this number, featch another playlist. 
		usePreload : true,			// if true, preload the next item in the playlist at the 50% mark of the currently playing item
		radioMode:	true,			// if true, whenever user clicks on play (after pausing the player) clear the playlist a and get a new one. 
		refreshInterval: 1000,		// number of milliseconds to call playProgress
		playMode:	"playlist"
	};
	
	
	var $ = {};
	var audio = new Audio();
	var audio2 = new Audio();
	var preload = true;


	var JSONdata = {};
	var items = [];
	var itemsNum = 0;
	var currentItem = "";
	
	var Log = function(x) {
		if (config.logging) {
			console.log(x);
		}
	};
	
	var getJSONplaylist = function() {
		
		$.getJSON( config.playlistURL,  function(data) {})
			  .done(function(data) {
			    Log( "JSON response received" );
				Log(data);
				JSONdata = data;
				parseJSONplaylist();
			  })
			  .fail(function() {
			    Log( "Json request failed" );
			  })
			  .always(function() {
			    //console.log( "complete" );
			  });
	};
	
	var parseJSONplaylist = function() {

	  $.each( JSONdata, function( key, val ) {
   			if (val.hasOwnProperty("filepath")) {
				items.push(val.filepath);
			}
 		  });
		itemsNum = items.length;
	};
	
	var playNext = function() {
		
		if (items.length == 0) {
			Log("No Items available");
			return;
		}
		currentItem = items[0];
		Log("Playing item: " + currentItem);
		items.splice(0,1);
		itemsNum = items.length;
		audio.src =  currentItem;
		audio.play();
		preload = true;
		
		if (itemsNum <= config.minItemsInPlaylist) {
				Log("getting new playlist");
				getJSONplaylist();
		}
		Log (config);
		Log(items);
	
	};
	
	var preloadNext = function() {
		
		preload = false;
		audio2.src = items[0];
		Log("preloading " + items[0]);
		audio2.load();
	
	}
	
	var startTimer = function() {
		setInterval("beagles.playProgress()", config.refreshInterval);
	};
	
	var clearPlaylist = function() {
		Log("Clear Playlist");
		audio.pause();
		audio.src = "";
		items.splice(0);
		Log(items);
		
	}
	
	return {
	
		init: function(c, j) {
		
			// copy or overwrite new attributes from page config to the local config. 
			 for (var attr in c) {
				config[attr] = c[attr];
   			 }
			 
			// store a copy of the jQuery object
			$ = j;
			
			if (config.hasOwnProperty("playlistURL") && config["playlistURL"] != "") {
				// start the AJAX call to get the JSON playlist
				getJSONplaylist();

				config.playMode = "playlist";
			}
			
			if (config.hasOwnProperty("streamURL") && config["streamURL"] != "") {
				// run in streaming mode
				config.playMode = "stream";
				
				audio.src = config.streamURL;
				audio.play();
				
			}
			
			// start the internal timer to monitor progress
			startTimer();
		},
		
		loadNewPlaylist : function(c) {
			clearPlaylist();				
			config.playlistURL = c;
			getJSONplaylist();
		},
		
		changeStream: function(c) {
		
			beagles.progressTracker = -1;
			beagles.playingState = "init";
			config.streamURL = c;
			audio.src = config.streamURL;
			audio.play();
		},
		
		play: function() {
		
			beagles.userCommand = "play";
			Log("play command");
						
			// set autoplay to true in case it was configured to be false. so that playback will start. 
			if (!config.autoplay) config.autoplay = true; 
					
			// in case there is no source for audio, get a new playlist and start. 
			if ( audio.src == "" && config.playMode == "playlist" ) {
			
				getJSONplaylist();
				startTimer();
				audio.play();
			
			// player is in streaming mode
			} else {
				
				beagles.resumePlay();
			
			}			
		},
		
		pause: function() {
		
			beagles.userCommand = "pause";
			Log("pause command");
			audio.pause();
		},
		
		resumePlay : function() {
			
			if ( beagles.userCommand !== 'pause' ) { 
				beagles.progressTracker = -1;
				beagles.playingState = "init";
				audio.src = config.streamURL;
				audio.play();
			}
			
		},
		
		changeVolume: function(dir) {
			
			var v = audio.volume;
			if (dir == "up") {
				v = v+0.1;
			} else if (dir == "down") {
				v = v-0.1;
			}
			if (v < 1 && v > 0) {
				audio.volume = v;
			}
			Log(v);
		},
		
		playProgress: function() {
		
			// calculate progress on current file
			progress_seconds = (audio.currentTime);
   					
			time = Math.ceil(progress_seconds);
			diff = time - beagles.progressTracker;
			
			if ( time > 10 ) { // for first 10 seconds of play don't try to check difference
				//if ( diff > 0.5 && diff < 1.5 ) {
				if ( beagles.progressTracker < (time+1) ) {
					beagles.playingState = "playing";
				} else {
					beagles.playingState = "stopped";
				}
				beagles.progressTracker++;
				
				if (diff > 10) {
					beagles.progressTracker = time;
					Log('Synching time');
				}
				
			} else {
				beagles.progressTracker = time;
			}
			
			
			Log('Seconds: ' + time + " state: " + beagles.playingState + " beagles.progressTracker " + beagles.progressTracker + " diff " + diff);

			
			if (config.playMode == "playlist") {
			// running in playlist mode
			
				progress_percent = (audio.currentTime / audio.duration * 100);
				
				// this is for first play only, if there is no progress but we have items in the playlist and autoplay is true, than start playing.
				if (isNaN(progress_percent) && items.length > 0 && config.autoplay) {
					playNext();
				}
			
				if (progress_percent > 50 && preload && config.usePreload) {
					preloadNext();
				}
				
				// checking if the current audio file has finished playing, if true than we move on to the next file.
				if (progress_percent >= config.continuePrecent) {
					playNext();
				}
			} else {
			// running in stream mode
				if (audio.readyState == 4 && config.hasOwnProperty("callBack")) {
					config.callBack.call();
				}
				
				if ( beagles.playingState == "stopped" ) {
					Log ("resumePlay called");
					beagles.resumePlay();
				}
				
			}
		},
		
		// tracking playing progress 
		progressTracker : -1, 
		
		// playing state
		playingState : "init",
		
		// tracks user pause/play command
		userCommand : ""
		
	}
};

