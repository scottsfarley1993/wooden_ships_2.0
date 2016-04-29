///this is Wooden Ships Main Javascript File
//All functions are here

var attrArray = ["countries_1715", "countries_1783", "countries_1815"];

var expressed = attrArray[0]

var attrProj = ["Azimuthal", "Cylindrical", "Orthographic"]; // list of projections

globals = {}
globals.basemap = {}
globals.map = {}
globals.map.dimensions ={};
globals.map.dimensions.height = $(window).height() * 0.9; //90% of the window height
globals.map.dimensions.width = $(window).width() //100% of the window width
globals.map.projection;
globals.map.path;

globals.attr = 'airTemp'

globals.data = {};
globals.data.filteredShips = []; //keep track of the currently applied filter

globals.map.hexRadius = 1;

globals.filter = {} //keep track of the currently applied filter

var radius = d3.scale.sqrt()
    .domain([0, 12])
    .range([0, 8]);

var expressedProj = attrProj[0];


$(document).ready(function(){
	//stuff that happens as the map is created.
	setMap(); //creates the map
	getShipData(displayShipDataHexes); //get the ship data 
	//createDropdown(attrArray); //creates the dropdown menu for years/basemap
	//projDropdown(attrProj) //creates the dropdown menu for projection
	
	//open the modal dialog --> splash screen
	//$("#splashModal").modal('show')
})


//set up map and call data
function setMap(){

	    //create new svg container for the map
	    globals.map.mapContainer = mapContainer = d3.select("#map")
	        .append("svg")
	        .attr("class", "mapContainer")
	        .attr("width", globals.map.dimensions.width)
	        .attr("height",  globals.map.dimensions.width);
	        
	    //use queue.js to parallelize asynchronous data loading
	    d3_queue.queue()
	        .defer(d3.json, "assets/data/ne_50m_land.topojson") //load base map data
	        .await(callback);
	        
		function callback(error, base, overlay1, overlay2, overlay3){
			//happens once the ajax have returned
	        console.log(error);
	        console.log(base);
	        
	        //translate europe TopoJSON
	        var landBase = topojson.feature(base, base.objects.ne_50m_land).features
	         
	         
	      //create the hexbin layout
	      globals.map.hexbin = d3.hexbin()
	    	.size([globals.map.dimensions.width, globals.map.dimensions.height])
	    	.radius(2.5)
	    	.x(function(d){
	    		return d.projected[0]
	    	})
	    	.y(function(d){
	    		return d.projected[1]
	    	})
	         
	         globals.land = globals.map.mapContainer.selectAll(".land")
	            .data(landBase)
	            .enter()
	            .append("path")
	            .attr("class", "land");
	            //.style("stroke", "black").style("fill", "blue"); 

			var graticule = d3.geo.graticule();


	        console.log(globals.land)
	         
	         changeProjection("Azimuthal");
	      
	    	
	}; //end of callback
};//end of set map

function zoomed() {
    mapContainer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    mapContainer.selectAll(".land").style("stroke-width", 1.5 / d3.event.scale + "px");
};
	


function createColorScheme (maxDomain, colors){
	
	var color = d3.scale.linear()
	    .domain([0, maxDomain])
	    .range(colors)
	    .interpolate(d3.interpolateLab);
	console.log(color.domain())
	console.log(color.range())
	return color;

};

// function color(ships, attr) {


// 	var minDomain = d3.min(ships)

// 	var maxDomain = 

// 	// var hexColors = map.selectAll(".hexagons")
// 	// 	.style("fill", function(d) { return color(d.length); });



// 	// //format a data array of ship data and display it on the map as hexbins
// 	// datasetArray.forEach(function(d){
// 	// 	var p = globals.map.projection([d['longitude'], d['latitude']])
// 	// 	d['projected'] = p
// 	// 	//d.date = parseDate(d.date);
// 	// })
// 	//  globals.map.hexagons = globals.map.mapContainer.append("g")
//  //      .attr("class", "hexagons")
//  //    .selectAll(".hexagons")
//  //      .data(globals.map.hexbin(datasetArray))
//  //    .enter().append("path")
//  //      .attr("d", globals.map.hexbin.hexagon())
//  //      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
//  //      //.style("fill", function(d) { return color(d3.median(d, function(d) { return +d.date; })); });
//  //      //.attr("fill", 'green')
//  //      //.attr('stroke', 'orange').style('stroke-width', 0.25)
//  //      .style("fill", function(d) { return color(d.length); });

// 	// ]

// };
    

	
	
//function to create a dropdown menu for attribute selection
function projDropdown(attrProj){
    //add select element
    var dropdownProjections = d3.select("#controls")
        .append("select")
        .attr("class", "dropdownProjections")
        .on("change", function(){
            if (this.value == "Cylindrical"){
            	changeProjection("Cylindrical")
            }else if (this.value == "Azimuthal"){
            	changeProjection("Azimuthal");
            }else if(this.value == "Orthographic"){
            	changeProjection("Orthographic")
            }
        });

    //add initial option
    var titleOption = dropdownProjections.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Projection");

    //add attribute name options
    var projOptions = dropdownProjections.selectAll("projOptions")
        .data(attrProj)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};
		

		 

//dropdown change listener handler
function changeProjection(projection, scale, center){
    //decide what projection to change to
    if (projection == "Azimuthal") {
    	// var projection = d3.geo.vanDerGrinten4()
    	// 	.scale(125)
   	 // 		.translate([globals.map.dimensions.width / 2, globals.map.dimensions.height / 2])
    	// 	.precision(.1);

    	// var projection = d3.geo.orthographic()
		   //  .scale(350)
		   //  .translate([globals.map.dimensions.width  / 2, globals.map.dimensions.height / 2])
		   //  .clipAngle(90)
		   //  .precision(.1);

		// var projection = d3.geo.azimuthalEqualArea()
		//     .clipAngle(180 - 1e-3)
		//     .scale(140)
		//     .translate([globals.map.dimensions.width / 2, globals.map.dimensions.height / 2])
		//     .precision(.1);
		var projection = d3.geo.robinson()
		    .scale(150)
		    .translate([globals.map.dimensions.width / 2, globals.map.dimensions.height / 2])
		    .precision(.1);

		// var projection = d3.geo.cylindricalEqualArea()
		//     .scale(200)
		//     .translate([globals.map.dimensions.width / 2, globals.map.dimensions.height / 2])
		//     .precision(.1);
    }
    else if (projection == "Cylindrical"){
    	// var projection = d3.geo.mercator()
    	// 	.scale((globals.map.dimensions.width + 1) / 2 / Math.PI)
    	// 	.translate([globals.map.dimensions.width  / 2, globals.map.dimensions.height / 2])
    	// 	.precision(.1);

    	var projection = d3.geo.cylindricalEqualArea()
		    .scale(200)
		    .translate([globals.map.dimensions.width / 2, globals.map.dimensions.height / 2])
		    .precision(.1);

    }else if (projection == "Orthographic"){
	var projection = d3.geo.orthographic()
		    .scale(350)
		    .translate([globals.map.dimensions.width  / 2, globals.map.dimensions.height / 2])
		    .clipAngle(90)
		    .precision(.1);
    }
   var path = d3.geo.path()
    	.projection(projection);
   //make global
   globals.map.projection = projection;
   globals.map.path = path;
   //do the update
   globals.land.transition().attr('d', path)
   
   //update the hexagons
   changeHexSize(globals.map.hexRadius)
};

// function getShipsData(filter, callback){
	// var t1, t2
	// $.ajax("http://grad.geography.wisc.edu/sfarley2/data.php", {
		// beforeSend: function(){
			// t1 = new Date().getTime();
			// console.log("Getting ships from: " + this.url)
			// $("#loading").show();
			// $("#nation-select-list").hide();
		// },
		// error: function(xhr, status, error){
			// console.log("ERROR: " + error);
		// },
		// data: filter,//this is an object with API parameters
		// dataType: "jsonp",//so we can reach an external server
		// success: function(response){
			// t2 = new Date().getTime();
			// console.log("Got response from ships server.");
			// globals.data.ships = response['data'];
			// console.log("Roundtrip to server took " + ((t2-t1)/1000) + " seconds.")
			// $("#")
			// //now we can do any callback we want
			// if (callback){
				// callback(response);
			// }
			// $("#splashModal").modal('hide')
			// $("#loading").hide();
		// }
	// })
// }
// //event listener for nation select
// 
// $(".nation-select").click(function(){
	// //load ships on button click
	// var nation = $(this).text();
	// //load ships data with this nation
	// filter = {
		// nationality: nation
	// };
	// getShipsData(filter);
// })
// 
// 
// $("#loading").hide()

function getShipData(callback){
	d3.csv("assets/data/british_points.csv", function(data){
		console.log(data)
		_.each(data, function(d){
			d.airTemp = +d.airTemp;
			d.pressure = +d.pressure
			d.sst = +d.sst
			d.winddirection = +d.winddirection;
			d.windSpeed = +d.windSpeed;
			d.latitude = +d.latitude;
			d.longitude = +d.longitude;
			d.date = new Date(d.date)
		})
		globals.data.ships = data //so we can revert later
		globals.data.filteredShips = data //keep track of the most recent filtered data
		if (callback){
			callback(data)
		}
	})
}

function displayShipDataHexes(datasetArray){
	//format a data array of ship data and display it on the map as hexbins
	datasetArray.forEach(function(d){
		var p = globals.map.projection([d['longitude'], d['latitude']])
		d['projected'] = p
		//d.date = parseDate(d.date);
	})
	 globals.map.hexagons = globals.map.mapContainer.append("g")
      .attr("class", "hexagons")
    .selectAll(".hexagons")
      .data(globals.map.hexbin(datasetArray))
    .enter().append("path")
    	.attr("class", "hexagon")
      .attr("d", globals.map.hexbin.hexagon())
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      //.style("fill", function(d) { return color(d3.mean(d, function(d) { return +d.windSpeed; })); });
      //.attr("fill", 'green')
      //.attr('stroke', 'orange').style('stroke-width', 0.25)

      //number of ships by hexbin
      //.style("fill", function(d) { return color(d.length); });

    // console.log(d3.min(globals.map.hexagons, function(d) { return d.length; }));
    // console.log(d3.max(globals.map.hexagons, function(d) {return d.length; }));


      //average windSpeed by hexbin
      // .style("fill", function(d) {
      // 	return color(d3.mean(d, function(d) { 
      // 		return +d.airTemp; 
      // 		})); 

      // })
      .on('click', function(d){
      		console.log(this)
      		console.log(d)
      })

      styleHexbins(globals.data.filteredShips, globals.attr)

}

function styleHexbins(ships, attr){

	// Beginning of boolean attributes
	if (attr == "fog") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	// boolean
	else if (attr == "gusts") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	// boolean
	else if (attr == "hail") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	// boolean
	else if (attr == "rain") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	// boolean
	else if (attr == "seaIce") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	// boolean
	else if (attr == "snow") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	// boolean
	else if (attr == "thunder") {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

	//the beginning of numeric attributes
	else if (attr == "airTemp"){

		var maxDomain = d3.max(ships, function(d){
			return +d["airTemp"]
		});

		console.log("Max domain is: " + maxDomain);

		var hexColor = createColorScheme(maxDomain, ["yellow", "red"]);

		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill", function(d){
				return hexColor(d3.mean(d, function(d){
					return +d.airTemp;
				}))
			});
	}

	//numeric
	else if (attr == "pressure"){

		var maxDomain = d3.max(ships, function(d){
			return +d["pressure"]
		});

		console.log("Max domain is: " + maxDomain);

		var hexColor = createColorScheme(maxDomain, ["white", "purple"]);

		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill", function(d){
				return hexColor(d3.mean(d, function(d){
					return +d.pressure;

				}))
			});

	}

	//numeric
	else if (attr == "sst"){

		var maxDomain = d3.max(ships, function(d){
			return +d["sst"]
		});

		console.log("Max domain is: " + maxDomain);

		var hexColor = createColorScheme(maxDomain, ["yellow", "red"]);

		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill", function(d){
				return hexColor(d3.mean(d, function(d){
					return +d.sst;
				}))
			});
	}

	//numeric
	else if (attr == "windSpeed"){

		var maxDomain = d3.max(ships, function(d){
			return +d["windSpeed"]
		});

		console.log("Max domain is: " + maxDomain);

		var hexColor = createColorScheme(maxDomain, ["white", "purple"]);

		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill", function(d){
				return hexColor(d3.mean(d, function(d){
					return +d.windSpeed;
				}))
			});
	}

	//numeric
	else if (attr == "winddirection"){

		var maxDomain = d3.max(ships, function(d){
			return +d["winddirection"]
		});

		console.log("Max domain is: " + maxDomain);

		var hexColor = createColorScheme(maxDomain, ["white", "purple"]);

		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill", function(d){
				return hexColor(d3.mean(d, function(d){
					return +d.winddirection;
				}))
			});
	}

	// default count data if filter has not been applied
	else {

		var maxDomain = d3.max(globals.map.hexagons[0], function(d){
			return d.__data__.length});

		console.log("Max domain is: " + maxDomain)

		var hexColor = createColorScheme(maxDomain, ["white", "steelblue"]);
		
		console.log(hexColor)
		d3.selectAll(".hexagon")
			.attr("fill",function(d){return hexColor(d.length)});
	}

} //end of styleHexbin

function switchAttribute(attr){
	globals.attr = attr
	styleHexbins(globals.data.filteredShips, attr);
}

function getPorts(filter, callback){        
	  d3_queue.queue()
	  	.defer(d3.json, "http://grad.geography.wisc.edu/sfarley2/voyageStarts.php", {geocode: true, modernName: true})
	  	.defer(d3.json, "http://grad.geography.wisc.edu/sfarley2/voyageStarts.php", {geocode: true, modernName: true})
	  	.await(uniquePorts)
}

function uniquePorts(){
	//combine the two parts arrays so that we have only one array of geocoded ports
	bigArray = globals.data.voyageStarts.concat(voyage.data.voyageEnds);
	globals.data.ports = _.uniq(bigArray, function(d){
		return d.place;
	})
}

function getLogbookRecord(locationID, callback){
	$.ajax("http://grad.geography.wisc.edu/sfarley2/data.php",{
		beforeSend: function(){
			console.log("Getting logbook data from: " + this.url)
		},
		data: {
			locationID: locationID
		},
		dataType:"jsonp",
		success: function(response){
			console.log(response['data'][0]);
			if(callback){
				callback(response);
			}
			changeHexSize(globals.map.hexRadius)
		},
		
		error: function(xhr, status, error){
			console.log("ERROR: " + error)
		}
	})
}

function removeHexes(){
	d3.selectAll(".hexagons").transition(100).remove()
}

function changeHexSize(radius){
	//remove all previous hexes
	console.log("changed hex size")
	removeHexes();
	globals.map.hexbin.radius(radius);
	displayShipDataHexes(globals.data.filteredShips)//with the most recent filter applied
}


//initialize hex bin slider
$( "#hexSlider" ).slider({
	min: 1,
	max: 50,
	value: 2,
	step: 0.5,
	change: function(evt, ui){
		newRadius = ui.value
		globals.map.hexRadius = newRadius;
		changeHexSize(newRadius)
	}
});
//control hex bin size