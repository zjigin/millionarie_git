(function($) {
 	// Global Values
	var CONST_CENTRE_ADDRESS = new google.maps.LatLng( 43.4679491, -80.5414458 ); // UW"s latlng
	var CONST_ZOOM = 14;
	var CONST_DISABLE_DEFAULT_UI = true;
	var CONST_PAN_CONTROL = true;
	var CONST_ZOOM_CONTROL = true;

	var CONST_PLAYER_INFO = "Hello world";

	var CONST_ANIMATION_STEP_SIZE = 50; // 5 meters
	var CONST_ANIMATION_STEP_DURATION = 100; // 100 miliseconds

	var map;

	//var player_marker;
	var player_info;
	var player_icon;

	var player_start_location;
	var player_end_location;
	var path_distance;
	var current_path;

	var landmarker_list;
	var total_landmarker_num;
	var landmarker_drop_speed = 500;
	
	// Create landmarker model
	var Landmarker_model = Backbone.Model.extend( {
		defaults: {
			map: '',
			position: '',
			title: '',
			flat:'',
		},
	} );

	// Create landmarker collection
	var Landmarker_collection = Backbone.Collection.extend({
        	model: Landmarker_model
    	});
	var landmarker_collection = new Landmarker_collection();

	// player_model
	var Player_model = Backbone.Model.extend({
		defaults: {
			player_model_marker: '',
			animation_token: 1,
			centre_token: 1
		},

		initialize: function() {
			// Create player marker
			player_model_marker = new google.maps.Marker({
				//position: CONST_CENTRE_ADDRESS,
				title: "Star",
				//map: map,
				//icon: player_icon,
				animation: google.maps.Animation.DROP,
				draggable: false
			});
			// Add on click listener
			google.maps.event.addListener(player_model_marker, "click", function() {
				if(player_model_marker.getAnimation() != null) {
					player_model_marker.setAnimation(null);
					player_info.close();
				} else {
					player_model_marker.setAnimation(google.maps.Animation.BOUNCE);
					player_info.open(map, player_marker);
				}       
			});
		},

		flip_animation_token: function() {
			this.set( { animation_token: this.get("animation_token")*(-1) } );
		},

		flip_centre_token: function() {
			this.set( { centre_token: this.get("centre_token")*(-1) } );
		},

		get_player_model: function() {
			return player_model_marker;
		}

	});

	var player_model = new Player_model();

	var Player_view = Backbone.View.extend({
		defaults: {
			view_landmarker_list: '',
		},

		initialize: function() {
			this.model = player_model;
			this.collection = landmarker_collection;
			this.view_landmarker_list = landmarker_list;

			this.listenTo( this.model, 'change:animation_token change:centre_token', this.move );
			this.listenTo( this.collection, 'add', this.render_landmark );
		},

		move: function() {
			map.panTo( player_model.get_player_model().getPosition() );
		},
	
		render_landmark: function() {
			var marker = new google.maps.Marker( {
				map: landmarker_collection.at( landmarker_collection.length-1 ).get( "map" ),
				position: landmarker_collection.at( landmarker_collection.length-1 ).get( "position" ),
				title: landmarker_collection.at( landmarker_collection.length-1 ).get( "title" ),
				flat: landmarker_collection.at( landmarker_collection.length-1 ).get( "flat" ),
				animation: google.maps.Animation.DROP,
			})

			google.maps.event.addListener(marker, "click", function() {
				marker_info = new google.maps.InfoWindow({
    					content: place.name
				});
				marker_info.open( map, marker );
			});
			landmarker_list.push( marker );
		}
	});
	var player_view = new Player_view();

	function initialize() {
		var mapOptions = {
			zoom: CONST_ZOOM,
			disableDefaultUI: CONST_DISABLE_DEFAULT_UI,
			panControl: CONST_PAN_CONTROL,
			zoomControl: CONST_ZOOM_CONTROL,
			center: CONST_CENTRE_ADDRESS,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		
		map = new google.maps.Map( document.getElementById("map_canvas"), mapOptions );

		player_icon = new google.maps.MarkerImage ( 
				"img/black_star.png",
				null,
				null,
				new google.maps.Point(16, 32),
			       	new google.maps.Size(32, 32)
		);

		player_info = new google.maps.InfoWindow({
    			content: CONST_PLAYER_INFO
		});

		player_marker = player_model.get_player_model();
		player_marker.setPosition( CONST_CENTRE_ADDRESS );
		player_marker.setIcon( player_icon );
		player_marker.setMap( map );

		google.maps.event.addListener(map, "zoom_changed", function() {
			var zoomLevel = map.getZoom();
			$("#zoom_level").text("Zoom: " + zoomLevel);
		});

		current_path = new google.maps.Polyline({
			path: [],
			strokeColor: "#000000",
			strokeWeight: 3
		});

		total_landmarker_num = 0;
		landmarker_list = [];
		get_landmarker();
	} // end of initialize

	google.maps.event.addDomListener(window, "load", initialize);

	// player_marker animation
	function get_route() {
		var rendererOptions = {
			map: map,
			suppressMarkers: true
		}
		
		var start = document.getElementById("startpoint").value;
		var end = document.getElementById("endpoint").value;	
     		var route_request = {
       			origin: start, 
       			destination: end,
       			travelMode: google.maps.DirectionsTravelMode.DRIVING
     		};

		var directionsService = new google.maps.DirectionsService();
		//var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

		directionsService.route(route_request, function(response, status) {
       			if (status != google.maps.DirectionsStatus.OK) {
					return;
			}

 			//directionsDisplay.setDirections(response);
			var route = response.routes[0];
			var bounds = new google.maps.LatLngBounds();
			var legs = response.routes[0].legs;
			player_start_location = new Object();
			player_end_location = new Object();
			player_start_location.latlng = legs[0].start_location;
			player_start_location.address = legs[0].start_address;
			player_end_location.latlng = legs[0].end_location;
			player_end_location.address = legs[0].end_address;

			player_marker.setPosition(player_start_location.latlng);

			var path = [];
			for(i = 0; i < legs.length; i++) {
				var steps = legs[i].steps;
				for (j = 0; j < steps.length; j++) {
					var nextSegment = steps[j].path;
					for (k = 0; k < nextSegment.length; k++) {
						path.push(nextSegment[k]);
						bounds.extend(nextSegment[k]);
					}
				}
			}

			current_path.setPath(path);
			current_path.setMap(map);
			path_distance = current_path.Distance();
			map.fitBounds(bounds);
			startAnimation();
     		});
	}

	function startAnimation() {
		map.setCenter(current_path.getPath().getAt(0));
		// Allow time for landmakers' drop animation
		setTimeout(animate, (total_landmarker_num-landmarker_list.length)*landmarker_drop_speed, 50);
	}

	function animate(displacement) {
		// Reach end of the route
		if( displacement > path_distance ) {
			player_model.flip_animation_token();
			player_marker.setPosition( player_end_location.latlng );
			return;
		}

		for (i = 0; i < landmarker_list.length; i++) {
			var distance = findDistance( player_marker.getPosition(), landmarker_list[i].getPosition() );
			if ( distance < 200 ) {
				landmarker_list[i].setAnimation(google.maps.Animation.BOUNCE);
			} else {
				if ( landmarker_list[i].getAnimation() != null) {
					landmarker_list[i].setAnimation(null);
				}
			}
		}

		var new_location = current_path.GetPointAtDistance(displacement);
	 	player_model.flip_animation_token();
		player_marker.setPosition(new_location);

		setTimeout(animate, CONST_ANIMATION_STEP_DURATION, displacement + CONST_ANIMATION_STEP_SIZE);
	}

	// Landmark search
	function get_landmarker() {
		var landmarker_request = {
			location: CONST_CENTRE_ADDRESS,
	 	 	radius: "2000",
		};

		var service = new google.maps.places.PlacesService(map);
		service.nearbySearch( landmarker_request, function(results, status) {
			if(status != google.maps.places.PlacesServiceStatus.OK) {
				return;
			}

			total_landmarker_num = results.length;
			for( var i = 0; i < results.length; i++ ) {
				setTimeout( create_marker, i*landmarker_drop_speed, results[i] );
			}
		});
	}

	function create_marker( place ) {
		var placeLoc = place.geometry.location;
		var landmarker_model = new Landmarker_model();

		landmarker_model.set({
			map: map,
			position: placeLoc,
			title: place.name,
			flat: false,
		});
		landmarker_collection.add( landmarker_model );
    	}

	function findRad(x) {
		return x * Math.PI / 180;
	}

	function findDistance( p1, p2 ) {
		var R = 6371; // earth's mean radius in km
		var dLat  = findRad(p2.lat() - p1.lat());
		var dLong = findRad(p2.lng() - p1.lng());
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(findRad(p1.lat())) * Math.cos(findRad(p2.lat())) * Math.sin(dLong/2) * Math.sin(dLong/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		return d.toFixed(3) * 1000;
	}

	// Create event
	$( "#navigation" ).click( function() {
		get_route();
	});

	$( "#F1" ).click( function() {
		player_model.flip_centre_token();
	});
	

})(jQuery);

