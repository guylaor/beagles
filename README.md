beagles
=======

HTML5 client for IceCast and Shoutcast internet radio streams written in Javascript


Code is coming soon! but you can see a working example here:

http://ramakrishnanandaradio.com/


===================

Sample implementation:

$( document ).ready( 
beagles.init({
		streamURL: 'http://ICE_CAST_URL/channel',
		logging: true,
		callBack: function() { hideBuffering() } 
	}, jQuery)
);




function hideBuffering() {
  console.log("player is playing");
}

