(function () {
    'use strict';

    angular
        .module('app')
        .controller('Home.IndexController', Controller);

    function Controller(UserService, FlashService, $window, $scope) {
        var vm = this;
        vm.user = null;
        var wayPtsArray = [];
        var locationGeometry = [];
        var distanceAndDuration = [];
        var start = null;

        initController();
        initMap();
        

        function initController() {
            // get current user
            UserService.GetCurrent().then(function (user) {
                vm.user = user;
            });
        }

        function initMap() {
            var directionsService = new google.maps.DirectionsService;
            var directionsDisplay = new google.maps.DirectionsRenderer;
            var infoWindow = new google.maps.InfoWindow();
            
            var map = new google.maps.Map(document.getElementById('map'), {
              zoom: 6,
              center: {lat: 41.85, lng: -87.65}
            });
            
            directionsDisplay.setMap(map);

            setInterval(function() { 
                getUpdatedLocation(infoWindow, map); 
            }, 3000);

            getCurrentLocation(infoWindow, map);

            var input = /** @type {!HTMLInputElement} */(
                document.getElementById('pac-input'));

            map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

            var autocomplete = new google.maps.places.Autocomplete(input);
            autocomplete.bindTo('bounds', map);
            var geocoder = new google.maps.Geocoder();

            google.maps.event.addListener(map, 'click', function(event) { 
                geocoder.geocode({
                        'latLng': event.latLng
                    }, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        if (results) {
                            var service = new google.maps.places.PlacesService(map);
                            service.getDetails({
                                placeId: results[0].place_id
                            }, function(place, status) {
                                if (status === google.maps.places.PlacesServiceStatus.OK) {
                                    var marker = new google.maps.Marker({
                                        map: map,
                                        position: place.geometry.location
                                    });

                                    wayPtsArray.push(place.formatted_address);
                                    locationGeometry.push(place.geometry.location);
                                    calculateAndDisplayRoute(directionsService, directionsDisplay);

                                    getWeatherInfo();
                                    google.maps.event.addListener(marker, 'click', function() {
                                        infoWindow.setContent('<div><strong>' + place.name + '</strong><br>' +
                                        place.formatted_address + '</div>');
                                        infoWindow.open(map, marker);
                                    });
                                }
                            });
                        }
                    }
                });
            });
            
    
            autocomplete.addListener('place_changed', function() {
                var place = autocomplete.getPlace();
                
                wayPtsArray.push(place.formatted_address);
                locationGeometry.push(place.geometry.location);
                calculateAndDisplayRoute(directionsService, directionsDisplay);
                getWeatherInfo();
            });
        }

        function getCurrentLocation(infoWindow, map) {
            // Try HTML5 geolocation.
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {   
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
    
                infoWindow.setPosition(pos);
                infoWindow.setContent('Location found.');
                infoWindow.open(map);
                map.setCenter(pos);
                start = pos;
                }, function() {
                handleLocationError(true, infoWindow, map.getCenter());
                });
            } else {
                // Browser doesn't support Geolocation
                handleLocationError(false, infoWindow, map.getCenter());
            }
    
            function handleLocationError(browserHasGeolocation, infoWindow, pos) {
            infoWindow.setPosition(pos);
            infoWindow.setContent(browserHasGeolocation ?
                                    'Error: The Geolocation service failed.' :
                                    'Error: Your browser doesn\'t support geolocation.');
            infoWindow.open(map);
            }
        }

        function getUpdatedLocation(infoWindow, map) {
            // Try HTML5 geolocation.
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {   
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
    
                infoWindow.setPosition(pos);
                infoWindow.setContent('You');

                start = pos;
                }, function() {
                handleLocationError(true, infoWindow, map.getCenter());
                });
            } else {
                // Browser doesn't support Geolocation
                handleLocationError(false, infoWindow, map.getCenter());
            }
    
            function handleLocationError(browserHasGeolocation, infoWindow, pos) {
            infoWindow.setPosition(pos);
            infoWindow.setContent(browserHasGeolocation ?
                                    'Error: The Geolocation service failed.' :
                                    'Error: Your browser doesn\'t support geolocation.');
            infoWindow.open(map);
            }
        }
    
        function calculateAndDisplayRoute(directionsService, directionsDisplay) {
            var waypts = [];
            for (var i = 0; i < wayPtsArray.length; i++) {              
                waypts.push({
                    location: wayPtsArray[i],
                    stopover: true
                });
            }

            directionsService.route({
                origin: start,
                destination: wayPtsArray[0],
                waypoints: waypts,
                optimizeWaypoints: true,
                travelMode: 'DRIVING'
            }, function(response, status) {
                if (status === 'OK') {
                    directionsDisplay.setDirections(response);
                    var route = response.routes[0];

                    distanceAndDuration.push(route.legs[0].distance.value);
                    distanceAndDuration.push(route.legs[0].duration.value);                    

                    var distance = 0;
                    var duration = 0;
                    for(let i = 0; i < distanceAndDuration.length; i++) {
                        if(i % 2 == 0){
                            distance = distance + distanceAndDuration[i];
                        } else {
                            duration = duration + distanceAndDuration[i];
                        }
                    }

                    distance = distance / 1000;
                    duration = duration / 3600;

                    $scope.distanceAndDuration = {
                        distance: Math.round(distance),
                        duration: Math.round(duration)
                    }
                    

                    $scope.$apply();
                } else {
                    window.alert('Directions request failed due to ' + status);
                    window.location.reload();
                }
            });
        }

        function getWeatherInfo() {
            var openWeatherMap = 'http://api.openweathermap.org/data/2.5/weather';
            if(locationGeometry.length > 0) {
                if (window.navigator && window.navigator.geolocation) {
                    window.navigator.geolocation.getCurrentPosition(function(position) {
                        $.getJSON(openWeatherMap, {
                            lat: locationGeometry[0].lat(),
                            lon: locationGeometry[0].lng(),
                            units: 'metric',
                            APPID: 'c01e69a9573e8410a7aee2e9285cb41f'
                        }).done(function(weather) {
                            var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                            var sunRise = new Date(d.setUTCSeconds(weather.sys.sunrise));
                            var sunSet = new Date(d.setUTCSeconds(weather.sys.sunset));
                            
                            $scope.weatherInfo = {
                                name: weather.name,
                                temperature: weather.main.temp,
                                pressure: weather.main.pressure,
                                humidity: weather.main.humidity,
                                sunrise: sunRise.getHours() + ':' + sunRise.getMinutes() + ' (24 Hours Format)',
                                sunset: sunSet.getHours() + ':' + sunSet.getMinutes() + ' (24 Hours Format)',
                                description: weather.weather[0].description,
                                wind_degree: weather.wind.deg,
                                wind_speed: weather.wind.speed
                            }

                            $scope.$apply();
                        });
                    });
                }
            } else {
                $scope.weatherInfo = {};
                $scope.$apply();
            }           
        }          
    }

})();