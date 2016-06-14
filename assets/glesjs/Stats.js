var Stats = function () {
	var prevTime = Date.now(), frames = 0;
	var fpsPanel = new Stats.Panel();
	return {
		update: function () {
			frames ++;
			var time = Date.now();
			if ( time > prevTime + 1000 ) {
				fpsPanel.update( ( frames * 1000 ) / ( time - prevTime ) );
				prevTime = time;
				frames = 0;
			}
			return time;
		}
	};
};

Stats.Panel = function () {
	var min = Infinity, max = 0, round = Math.round;
	var fpss = [0,0,0,0,0,0,0,0,0,0];
	var index = 0;
	return {
		update: function ( value ) {
			min = Math.min( min, value );
			max = Math.max( max, value );
			if (index < 10) {
				fpss[index++] = value;
			} else {
				var total = 0;
				for (i=0; i<10; i++) {
                    total += fpss[i];
				}
				var average = total / 10;
				console.log( round( average ) + ' ' + 'FPS' + ' (' + round( min ) + '-' + round( max ) + ')');
				index = 0;
			};
		}
	};

};