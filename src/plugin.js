import videojs from 'video.js';
import { version as VERSION } from '../package.json';
// import request from 'request';

// Default options for the plugin.
const defaults = {
	width:160, 
	height:90, 
	timeTooltip:true,
	basePath : "", 
	src: "",
	responsive: false,
	mediaqueries: {'tiny': .5 , 'small': .75 ,'medium': 1, 'large': 1.25, 'xlarge': 1.5 }
}

const onPlayerReady = (player, options) => {


	defaults.basePath = '';
	var div, t_img, settings, canvas, canva, thumbposter, progressControl, progressHolder, duration, moveListener, tooltip, moveCancel,thumbTrack, vttCues;

    if(options) {
		if(options.basePath) defaults.basePath = options.basePath;
		if(options.width && options.height) {
			defaults.width=options.width;
			defaults.height = options.height;
		}
		if(options.src) {
			player.on('ready',function() {
				player.trigger('medialoaded',{xml:options.src});
			});
		}
	}
	settings = options;

    function parseImageLink (imglocation) {
      var lsrc, hashindex, hashstring;
      hashindex = imglocation.indexOf('#');
      if (hashindex === -1) {
        return {src:imglocation,w:0,h:0,x:0,y:0};
      } 
      lsrc = imglocation.substring(0,hashindex);
      hashstring = imglocation.substring(hashindex+1);
      if (hashstring.substring(0,5) !== 'xywh=') {
        return {src:defaults.basePath + lsrc,w:0,h:0,x:0,y:0};
      } 
      var data = hashstring.substring(5).split(',');
      return {src:defaults.basePath + lsrc,w:parseInt(data[2],10),h:parseInt(data[3],10),x:parseInt(data[0],10),y:parseInt(data[1],10)};
    }


    function deconstructTimestamp(timestamp) {
		const splitStampMilliseconds = timestamp.split('.');
		const timeParts = splitStampMilliseconds[0];
		const timePartsSplit = timeParts.split(':');

		return {
		  milliseconds: parseInt(splitStampMilliseconds[1], 10) || 0,
		  seconds: parseInt(timePartsSplit.pop(), 10) || 0,
		  minutes: parseInt(timePartsSplit.pop(), 10) || 0,
		  hours: parseInt(timePartsSplit.pop(), 10) || 0
		};

	  }

	  function getSecondsFromTimestamp(timestamp) {
		const timestampParts = deconstructTimestamp(timestamp);

		return parseInt((timestampParts.hours * (60 * 60)) +
		  (timestampParts.minutes * 60) +
		  timestampParts.seconds +
		  (timestampParts.milliseconds / 1000), 10);
	  }



function getData(url) {
	
  fetch(url)
	.then(response => response.text())
	.then(data => {
	    if(data.length>0) {
			var cues = processVtt(data); //console.log(data);  
			if(cues.length>0) {
				vttCues = cues;
				process_thumbs();
			}
		}
  });



}


	function processVtt(data) {
		var processedVtts = [];
		var vttDefinitions = data.split(/[\r\n][\r\n]/i);

		vttDefinitions.forEach(function(vttDef){
			if (vttDef.match(/([0-9]{2}:)?([0-9]{2}:)?[0-9]{2}(.[0-9]{3})?( ?--> ?)([0-9]{2}:)?([0-9]{2}:)?[0-9]{2}(.[0-9]{3})?[\r\n]{1}.*/gi)) {
			const vttDefSplit = vttDef.split(/[\r\n]/i);
			const vttTiming = vttDefSplit[0];
			const vttTimingSplit = vttTiming.split(/ ?--> ?/i);
			const vttTimeStart = vttTimingSplit[0];
			const vttTimeEnd = vttTimingSplit[1];
			const vttImageDef = vttDefSplit[1];
			//const vttCssDef = this.getVttCss(vttImageDef);

			processedVtts.push({
				startTime: getSecondsFromTimestamp(vttTimeStart),
				endTime: getSecondsFromTimestamp(vttTimeEnd),
				text: vttImageDef
			});

			
		}
    });

    return processedVtts;
  }
		

	


  player.on('medialoaded', function(event,data) {



		vttCues =[];
		progressControl = player.controlBar.progressControl;
		progressHolder = player.el_.querySelector('.vjs-progress-holder');				
			
			progressHolder.removeEventListener('touchstart',slidetouch);
			progressHolder.removeEventListener('mousemove',moveListener);
			progressHolder.removeEventListener('mouseleave',moveCancel);
			progressHolder.removeEventListener('mousedown',slidedown);
			player.sprite=false;

			var el4 = player.el_.querySelector('.vtt_canvas');
			if(el4) el4.parentNode.removeChild(el4);
			var el3 = player.el_.querySelector('.vjs-thumb-tooltip');
			if (el3) el3.parentNode.removeChild(el3);
			var el2 = player.el_.querySelector('.vjs-thumb-image');
			if (el2) el2.parentNode.removeChild(el2);
			var el1 = player.el_.querySelector('.vjs-thumbnail-holder');
			if(el1) el1.parentNode.removeChild(el1);

		
		if(data && data.xml) {
			if(settings.debug) console.log('data from xml');
			getData(data.xml);
			
		} else {
		
			progressControl = player.controlBar.progressControl;
			progressHolder = player.el_.querySelector('.vjs-progress-holder');


		
			var numtracks = player.textTracks().length;


			if (numtracks === 0) {
				if(div) videojs.dom.addClass('div','vjs-hidden');
			  return;
			}
			var istrack=false;

			var i = 0;
			while (i<numtracks) {

		
			  if (player.textTracks()[i].kind==='metadata') { 
                
				thumbTrack = player.textTracks()[i];
				if(thumbTrack.src===undefined) return;
                
	
			    if (thumbTrack.src) {
					if(settings.debug) console.log('data from track');
					getData(thumbTrack.src); return;
				}
				thumbTrack.mode = 'hidden';
				thumbTrack = player.textTracks()[i];
				istrack=true; thumbTrack.mode='showing';
				if(thumbTrack.cues == null) {thumbTrack.mode = 'hidden'; return; }
				var cnum = thumbTrack&&thumbTrack.cues.length;


				
				break;
			  }
			  i++;
			}
			if(istrack!==true) {
				if(div) videojs.dom.addClass('div','vjs-hidden');
				return;
			}
			thumbTrack = player.textTracks()[i];
			cnum = thumbTrack&&thumbTrack.cues.length;

			if(cnum<1) {
				
				return;
			}
			
			i = 0;
			player.sprite=true;

			
		

				
			vttCues = thumbTrack&&thumbTrack.cues;
			process_thumbs();

		}

	});
	
	

	function process_thumbs()  {
		
		
	
		


		div = document.createElement('div');
		div.className = 'vjs-thumbnail-holder';

		canvas = document.createElement("canvas");
		canvas.className = "vtt_canvas";
		canvas.style.position = "absolute";
		canvas.style.left = "0";
		canvas.style.top = "0";
		div.appendChild(canvas);


		tooltip = document.createElement('div');
		tooltip.className = 'vjs-thumb-tooltip';
		t_img = document.createElement('img');
		t_img.className = 'vjs-thumb-image';
		t_img.style.visibility="hidden";
		t_img.style.left='-500px';
		t_img.style.top='-500px';
		document.body.appendChild(t_img);
		div.appendChild(tooltip);

		progressControl.el().appendChild(div);

		if( player.shadowSlide) {
			var el_poster = player.el_.querySelector('.vjs-thumb-poster');
			if(!el_poster) {
				thumbposter = document.createElement('div');
				thumbposter.className = 'vjs-thumb-poster';
				canva = document.createElement('canvas');
				thumbposter.appendChild(canva);
				player.el_.insertBefore(thumbposter,player.el_.querySelector('.vjs-poster'));
			}
		}

		duration = player.duration();

		

		player.on('durationchange', function(event) {
			duration = player.duration();
		});
		player.on('loadedmetadata', function(event) {
		  duration = player.duration();
		});

		 

		var ppr = progressControl.el_.querySelector('.vjs-play-progress');
		var ttp = ppr.querySelector('.vjs-time-tooltip');
		if(ttp) videojs.dom.addClass(ttp,'vjs-abs-hidden');
		var mtp = progressControl.el().querySelector('.vjs-mouse-display');
		if(mtp) mtp.style.opacity=0;


		var supportsPassive = false;
		var opts = Object.defineProperty({}, 'passive', {
			get: function() { supportsPassive = true;return true; }
		});
		window.addEventListener("testPassive", null, opts);
		window.removeEventListener("testPassive", null, opts);



		progressHolder.addEventListener('mousemove',moveListener);
		progressHolder.addEventListener('mouseleave',moveCancel);
		progressHolder.addEventListener('mousedown',slidedown);





		progressHolder.addEventListener('touchstart',slidetouch, supportsPassive ? { passive: false } : false);
	}


		function formTime(seconds,guide) {
		  seconds = seconds < 0 ? 0 : seconds;
		  let s = Math.floor(seconds % 60);
		  let m = Math.floor(seconds / 60 % 60);
		  let h = Math.floor(seconds / 3600);
		  const gm = Math.floor(guide / 60 % 60);
		  const gh = Math.floor(guide / 3600);
		  if (isNaN(seconds) || seconds === Infinity) {
			h = m = s = '-';
		  }
		   h = (h > 0 || gh > 0) ? h + ':' : '';
			m = (((h || gm >= 10) && m < 10) ? '0' + m : m) + ':';
			s = (s < 10) ? '0' + s : s;
			return h + m + s;
		}
		function thumb_out() {
			progressIndex(false);
			div.classList.remove('vjs-thumb-show');
			if(player.shadowSlide) {
				thumbposter.removeAttribute('style');
				canva.width=0;canva.height=0;

			}
		}

		 function progressIndex(how) {
			if(how) {
				progressControl.el().setAttribute("style","z-index:22");
			} else {
				progressControl.el().removeAttribute("style");
			}
			
		}

		moveCancel = function(e) {
		 
		 if(videojs.holderdown!==true) {
				progressIndex(false);
			  div.classList.remove('vjs-thumb-show');
		  }
		};
		function slideup() {

			videojs.holderdown=false;
			document.removeEventListener('mousemove',moveListener);
			document.removeEventListener('mouseup',slideup);
			thumb_out();
		}
		function slidedown(e) {
			videojs.holderdown=true;
			progressIndex(true);
		   document.addEventListener('mousemove',moveListener);
		   document.addEventListener('mouseup',slideup);
		   moveListener(e);

		}

		function slideend() {
			progressHolder.removeEventListener('touchmove',moveListener);
			progressHolder.removeEventListener('touchend',slideend);
			thumb_out();
		}
		function slidetouch(e) {
			videojs.holderdown=false;
			moveListener(e);
			progressHolder.addEventListener('touchmove', moveListener);
			progressHolder.addEventListener('touchend',slideend);
		}

		canvas=null;

		moveListener = function(e) {
		 progressIndex(true);
		  e.preventDefault();
		  //e.stopPropagation()
		  duration = player.duration();

		  var holder = progressControl.el().querySelector('.vjs-progress-holder');
		  var prg = progressControl.el().querySelector('.vjs-play-progress');
		  var rect=holder.getBoundingClientRect();


		  var pagex=null;
		  

		  if(e.pageX) {
				pagex = e.pageX;
		  } else if(e.changedTouches) {
				pagex=e.changedTouches[0].pageX || e.touches[0].clientX;
		  }
			
		  var left = pagex-rect.left;




		  if(left===0 && videojs.holderdown && prg.offsetWidth>0) {
				//left=prg.offsetWidth;
		  }
		  if(left<0) left=0; if(left> holder.offsetWidth)left= holder.offsetWidth;
		  //if(videojs.holderdown) 
			  //prg.style.width=left+'px';

		  if(settings.timeTooltip) {
			var percent = left/holder.offsetWidth;
			var mouseTime= percent*duration;
			var tip = div.querySelector('.vjs-thumb-tooltip');
			if(tip) tip.innerHTML=formTime(mouseTime,duration);

		  }

		  //Now check which of the cues applies
		  var cnum = vttCues.length;

		  
		 
		  var i = 0; var is_slide=false;
		  while (i<cnum) {
			var ccue = vttCues[i];
			if (ccue.startTime <= mouseTime && ccue.endTime >= mouseTime) {
			  is_slide=true;
			  var vtt = parseImageLink(ccue.text);
			  break;
			}
			i++;
		  }

		  vtt.iw=vtt.w; vtt.ih=vtt.h;
		  
		
		  //None found, so show nothing
		  if (is_slide!==true) {

			div.classList.add("vjs-hidden");

			return; 
		  } 
		  div.classList.remove("vjs-hidden");

		  

		  //Changed image?
		  var ss = false;
		  var vttsrc=vtt.src.replace(/\.\.\//g, '');

		 if(t_img.src.indexOf(vttsrc)<0) {

			t_img.src =  vtt.src;
			ss=true;
		  }



		  //Fall back to plugin defaults in case no height/width is specified
		  if ( vtt.w === 0) {
			 vtt.w = settings.width;
			  t_img.style.width=vtt.w+'px';

		  }
		  if ( vtt.h === 0) {
			 vtt.h = settings.height;
			 t_img.style.height=vtt.h+'px';

		  }

		  var prc=1;


		  if(settings.responsive && settings.mediaqueries) {
			 var w = player.el_.offsetWidth;
			 if(w<=320) prc= settings.mediaqueries.tiny;
			 if(w>320 && w<=540 ) prc = settings.mediaqueries.small;
			 if(w>540 && w<=1080) prc=settings.mediaqueries.medium;
			 if(w>1080 && w<=1600) prc = settings.mediaqueries.large;
			 if(w>1600) prc = settings.mediaqueries.xlarge;
		  }
		  


		  var width =  vtt.w*prc;
		  var height =  vtt.h*prc;
		
		if(canvas.width<1) {
	
		}
		  //Set the container width/height if it changed
		  if (div.style.width !==  width || div.style.height !== height) {
			div.style.width =  width + 'px';
			div.style.height =  height + 'px';
		  }

			var context = canvas.getContext("2d");
		  
		  if(ss) {
					t_img.onload=function() {
				
						canvas.width=width;
						canvas.height=height
						vtt.x=0;vtt.y=0;
						context.drawImage(t_img,vtt.x,vtt.y,vtt.w,vtt.h,0,0,canvas.width,canvas.height);
						
					}
				} else {
					if(vtt.iw>0 && vtt.ih>0) {
						canvas.width=width;
						canvas.height=height
						context.drawImage(t_img,vtt.x,vtt.y,vtt.w,vtt.h,0,0,canvas.width,canvas.height);
					}
				}
		
		  

		  //var width =  vtt.w;
		  var halfWidth = width / 2;
		  var right = progressControl.el().offsetWidth;
		  var holef = player.el_.querySelector('.vjs-progress-holder').offsetLeft;
		  var halfWidth2=halfWidth-holef;

		  // make sure that the thumbnail doesn't fall off the right side of the left side of the player
		  if ( (left + halfWidth+holef) > right ) {
			left = right - width;
		  } else if (left < halfWidth2) {
			left = 0;
		  } else {
			left = left-halfWidth2; 
		  }

		  div.style.left = parseInt(left,10) + 'px';
		 div.classList.add('vjs-thumb-show');

		  if(videojs.holderdown && player.shadowSlide) {

					var el_poster = player.el_.querySelector('.vjs-thumb-poster');
					if(!el_poster) {
					thumbposter = document.createElement('div');
					thumbposter.className = 'vjs-thumb-poster';
					canva = document.createElement('canvas');
					thumbposter.appendChild(canva);
					player.el_.insertBefore(thumbposter,player.el_.querySelector('.vjs-poster'));
					}

					var ctx = canva.getContext('2d');
					canva.width = player.el_.offsetWidth; 
					canva.height = player.el_.offsetHeight;
					thumbposter.style.width=canva.width+'px';
					thumbposter.style.height=canva.height+'px';
					ctx.clearRect(0, 0, canva.width, canva.height);
					ctx.drawImage(t_img,vtt.x,vtt.y,vtt.w,vtt.h,0,0,canva.width,canva.height);

				
		   }

		}
};


const thumbnails = function(options) {
  this.ready(() => {
    onPlayerReady(this, videojs.obj.merge(defaults, options));
  });
};
const registerPlugin = videojs.registerPlugin || videojs.plugin;
// Register the plugin with video.js.
registerPlugin('thumbnails', thumbnails);

// Include the version number.
thumbnails.VERSION = VERSION;

export default thumbnails;
