///this is Wooden Ships Main Javascript File
//All functions are here

var attrArray = ["countries_1715", "countries_1783", "countries_1815"];

var expressed = attrArray[0]

var months = moment.months()
var weekdays = moment.weekdays()

var attrProj = ["Azimuthal", "Azimuthal", "sat"]; // list of projections

globals = {}
globals.basemap = {}
globals.map = {}
globals.map.dimensions ={};
globals.map.dimensions.height = $('#map').height() * 0.9; //90% of the window height
globals.map.dimensions.width = $("#map").width() * 0.9 //100% of the window width
globals.map.projection;
globals.map.path;

sens = 0.25;

console.log(globals.map.dimensions)

globals.attr = 'fog'

globals.mamoType = "All"

globals.data = {};
globals.data.filteredShips = []; //keep track of the currently applied filter

globals.map.hexRadius = 5;

scale0 = (globals.map.dimensions.width - 1) / 2 / Math.PI;

globals.filter = {} //keep track of the currently applied filter

globals.memoTooltip = d3.select("body").append("div")	
    .attr("class", "tooltip")				
    .style("opacity", 0);

globals.portRankThreshold = 50;

var radius = d3.scale.sqrt()
    .domain([0, 12])
    .range([0, 8]);

var expressedProj = attrProj[0];


//this should be replaced with a better coloring func
var color = d3.scale.linear()
    .domain([0, 60])
    .range(["green","darkred"])
    .interpolate(d3.interpolateLab);
    
parseDate = d3.time.format("%x").parse;

var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 21])
    .on("zoom", zoomed);
    
String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

//change the stacking order of d3 elements
// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function() {  
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function() {  
    return this.each(function() { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) { 
            this.parentNode.insertBefore(this, firstChild); 
        } 
    });
};


setMap(); //creates the map --> ASAP

$(document).ready(function(){
	//stuff that happens as the map is created.
	createSummaryBarchart() //prepare the summary window
	loadCaptainMetadata() //loads images and datas about the captains
	getPorts();//get the port cities and display them
	changeCountry("British")
	loadShipLookup() // get metadata about ships and voyages and captains
	d3.selectAll(".overlay").style('display', 'none')//disables zoom --> for debugging
	updateTimeline(new Date(1750,0,1), new Date(1850,0,1))
})

function onDrag(){
	    var rotate = globals.map.projection.rotate();
	    globals.map.projection = globals.map.projection.rotate([d3.event.x * sens, -d3.event.y * sens, rotate[2]]); //do the projection rotation
		//change the x/y coordinates of the hexbin
	    globals.map.hexbin.x(function(d){
	    	return  globals.map.projection([d.longitude, d.latitude])[0];
	    })
	    globals.map.hexbin.y(function(d){
	    	return  globals.map.projection([d.longitude, d.latitude])[1];
	    })
	    //remove and redraw the hexagons
	    d3.selectAll(".hexagons").remove();
	    displayShipDataHexes(globals.data.filteredShips);
	    //redraw the land
	    globals.map.mapContainer.selectAll(".land").attr("d", globals.map.path);
	    // //redraw the ports
	    d3.selectAll(".port-marker")
	    	.attr('cx', function(d){
	    	return globals.map.projection([d.Longitude, d.Latitude])[0];
	    })
	    	.attr('cy', function(d){
	    		return globals.map.projection([d.Longitude, d.Latitude])[1];
	    	})
	  //port labels 
	  d3.selectAll(".port-label")
	    	.attr('x', function(d){
	    	return globals.map.projection([d.Longitude, d.Latitude])[0] + 5;
	    })
	    	.attr('y', function(d){
	    		return globals.map.projection([d.Longitude, d.Latitude])[1] - 5;
	    })		    
}

//set up map and call data
function setMap(){	        
	    //use queue.js to parallelize asynchronous data loading
	    d3_queue.queue()
	        .defer(d3.json, "assets/data/ne_50m_land.topojson") //load base map data
	        .await(callback);
	        
		function callback(error, base, overlay1, overlay2, overlay3){
			//happens once the ajax have returned
	        	    //create new svg container for the map
	    globals.map.mapContainer = mapContainer = d3.select("#map")
	        .append("svg")
	        .attr("class", "mapContainer")
	        .attr("width", globals.map.dimensions.width)
	        .attr("height",  globals.map.dimensions.height);
	        
	        
	    globals.map.features = globals.map.mapContainer.append("g"); //this facilitates the zoom overlay

		 globals.map.mapContainer.call(zoom).call(zoom.event)
		 globals.map.mapContainer.call(d3.behavior.drag()
		  .origin(function() { 
		  	var r = globals.map.projection.rotate(); 
		  	return {x: r[0] / sens, y: -r[1] / sens}; 
		  })
		  .on("drag", onDrag))
		    
		    
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
	         
	         globals.land = globals.map.features.selectAll(".land")
	            .data(landBase)
	            .enter()
	            .append("path")
	            .attr("class", "land")
	            //.style("stroke", "black").style("fill", "blue"); 
	         
	         changeProjection("Azimuthal"); //default
	}; //end of callback
};//end of set map

function zoomed() {
	evt = d3.event
	// d3.selectAll(".land").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	// d3.selectAll(".hexagons").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	// d3.selectAll(".port").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	// d3.selectAll(".overlay").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
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

function getShipData(filename, callback){
	d3.csv(filename, function(data){
		_.each(data, function(d){
			d.airTemp = +d.airTemp;
			d.pressure = +d.pressure
			d.sst = +d.sst
			d.winddirection = +d.windDirection;
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
	 globals.map.hexagons = globals.map.features.append("g")
	      .attr("class", "hexagons")
	    .selectAll(".hexagons")
	      .data(globals.map.hexbin(datasetArray))
	    .enter().append("path")
	    	.attr('class', 'hexagon')
	      .attr("d", globals.map.hexbin.hexagon())
	      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
	      .style('stroke-width', 0.25)
	      .on('click', function(d){
	      	//memos = filterToHexBin(globals.data.memos, d)
	      	//console.log(memos)
	      	console.log(d);
      })
      .on('mouseover', function(d){
      	d3.select(this).moveToFront()
      	d3.select(this).style({'stroke': 'orange', "stroke-width": 1})
      	displayWindSpeed(d)
      	summary = getSummaryOfHex(d)
      	displaySummary(summary)
      })
      .on('mouseout', function(d){
      	if (!globals.isolationMode){
      		d3.select(this).style({'stroke': 'none'})
      	}
      })
      .on('click', function(d){
      	//enter isolationMode on click
      	var _this = d3.select(this)
      	if (!_this.classed('isolated')){
      		//it hasnt been clicked yet, so enter isolation mode
      		_this.style({'stroke': 'white', "stroke-width": 1})
      		enterIsolationMode()
      		_this.classed('isolated', true)
      		memos = filterToHexBin(globals.filteredMemos, d)
      		displayMemos(memos)
      	}
      })
      
      styleHexbins(globals.data.filteredShips, globals.attr) //color the bins by attribute
      //set the stack order
      globals.land.moveToFront();
      d3.selectAll(".port").moveToFront();
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

function getPorts(){        
	//load the port cities from a csv file on disk
	  d3.csv("/assets/data/port_cities_scale_rank.csv", function(data){
	  	globals.data.ports = data;
	  	displayPorts(data);
	  })
}

function displayPorts(portData){
	globals.portScale = d3.scale.linear()
		.range([0, 10])
		if (globals.nationality == "British"){
			globals.portScale.domain([0, d3.max(portData, function(d){return +d.BritishRank})])
			}
			else if (globals.nationality == "Spanish"){
			globals.portScale.domain([0, d3.max(portData, function(d){return +d.SpanishRank})])
			}else if(globals.nationality == "Dutch"){
			globals.portScale.domain([0, d3.max(portData, function(d){return +d.DutchRank})])
			}else if (globals.nationality == "French"){
			globals.portScale.domain([0, d3.max(portData, function(d){return +d.FrenchRank})])
			}else{
			globals.portScale.domain([0, 100])
			}
	globals.ports = globals.map.features.selectAll(".port")
		.data(portData)
		.enter().append('g')
		.attr('class', 'port')
		
	globals.ports
		.append("circle")
		.attr('class', 'port-marker')
		.attr("cx", function(d){
			projx = globals.map.projection([d.Longitude, d.Latitude])[0]
			return projx
		})
		.attr("cy", function(d){
			projy = globals.map.projection([d.Longitude, d.Latitude])[1]
			return projy
		})
		.attr('r', function(d){
			if (globals.nationality == "British"){
				return globals.portScale(+d.BritishRank);
			}
			else if (globals.nationality == "Spanish"){
				return globals.portScale(+d.SpanishRank);
			}else if(globals.nationality == "Dutch"){
				return globals.portScale(+d.DutchRank);
			}else if (globals.nationality == "French"){
				return globals.portScale(+d.FrenchRank);
			}else{
				return 0
			}
		})
		.style('fill', 'red')
		.style('stroke', 'black')
		
	globals.ports
		.append('g')
			.append('text')
			.attr('class', 'port-label')
			.attr('x', function(d){return globals.map.projection([d.Longitude, d.Latitude])[0] + 5})
			.attr('y', function(d){return globals.map.projection([d.Longitude, d.Latitude])[1] - 5})
			.style('font-size', '10px')
			.text(function(d){
				if (globals.nationality == "British"){
					t = +d.BritishRank;
				}
				else if (globals.nationality == "Spanish"){
					t = +d.SpanishRank;
				}else if(globals.nationality == "Dutch"){
					t = +d.DutchRank;
				}else if (globals.nationality == "French"){
					t = +d.FrenchRank;
				}else{
					t = 0
				}
				if (t > globals.portRankThreshold){
					return d.OriginalName
				}
				
			})
			.style('fill', 'red')
			.on('mouseover', function(){
				d3.select(this).style("fill", 'white').style("cursor", "crosshair")
				d3.select(this).moveToFront();
			})
			.on('mouseout', function(){
				d3.select(this).style('fill', 'black').style("cursor", "auto")
			})
}

function refreshStackOrder(){
	d3.selectAll(".overlay").moveToBack()
	d3.selectAll(".hexagon").moveToFront()
	globals.land.moveToFront()
	globals.ports.moveToFront()
	console.log("stack order complete")
}

function switchAttribute(attr){
	globals.attr = attr
	styleHexbins(globals.data.filteredShips, attr);
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

function processMemos(memos){
	_.each(memos, function(d){
		d['Latitude'] = Number(d['Latitude'])
		d['Longitude'] = Number(d['Longitude'])
		q = d['obsDate']
		d['date'] = new Date(q)
	})
	globals.data.memos = memos
	globals.filteredMemos = memos
	console.log("Done loading memos")
}

function changeCountry(countryName){
	//changes the map interface to reflect a new country's data.  Options are 'Dutch', 'French', 'British', 'Spanish'
	//load in new data
	
	
	if (countryName == "British"){
		f = "/assets/data/british_points_updated.csv"
		d3.csv("/assets/data/british_memos_updated.csv", function(data){
			processMemos(data)
		})
		globals.nationality = "British"
	}
	else if (countryName == "Dutch"){
		f = "/assets/data/dutch_points_updated.csv"
		d3.csv("/assets/data/dutch_memos_updated.csv", function(data){
			processMemos(data)
		})
		globals.nationality = "Dutch"
	}
	else if (countryName == "Spanish"){
		f = "/assets/data/spanish_points_updated.csv"
		d3.csv("/assets/data/spanish_memos_updated.csv", function(data){
			processMemos(data)
		})
		globals.nationality = "Spanish"
	}
	else if (countryName == "French"){
		f = "/assets/data/french_points_updated.csv"
		d3.csv("/assets/data/french_memos_updated.csv", function(data){
			processMemos(data)
		})
		globals.nationality = "French"
	}
	else{
		console.log("Invalid country name.")
		return
	}
	d3_queue.queue()
		.defer(getShipData, f)
		.await(refreshHexes)
}

function refreshHexes(){
	console.log("Loaded ship data.")
	removeHexes()
	displayShipDataHexes(globals.data.ships)
	console.log("Refreshed hexes.")
}

function loadShipLookup(){
	//laods metadata about ships and voyages from the disk
	d3.csv("/assets/data/ship_lookup_original.csv",function(data){
		globals.data.shipLookup = data;
	});

}


///memo filtering functions
function filterToBiology(memoSet){
	//returns a an array of memos with only memos reporting biology included
	o = _.where(memoSet, {memoType: "Biology"})
	return o
}
function filterToShipAndRig(memoSet){
	//returns an array of memos with only those reportingon the ship's condition included
	o= _.where(memoSet, {memoType: "ShipAndRig"})
	return o
}
function filterToWeatherReports(memoSet){
	//returns an array of memos with only those reporting daily weather reports
	o = _.where(memoSet, {memoType: "weatherReport"})
	return o
}
function filterToOther(memoSet){
	//returns an array of memos with only those reporting other remarks included
	o = _.where(memoSet, {memoType: "OtherRem"})
	return o
}
function filterToAnchored(memoSet){
	//returns an array of memos with only those that note that the ships is anchored included
	o = _.where(memoSet, {memoType: "Anchor"})
	return o
}
function filterToEncounter(memoSet){
	o = _.where(memoSet, {memoType: "Encounter"})
	return o
}
function filterToTravel(memoSet){
	o = _.where(memoSet, {memoType: 'travelReport'})
	return o
}

function filterToLandmarks(memoSet){
	o = _.where(memoSet, {memoType: "Landmark"})
	return o
}
function filterToCargo(memoSet){
	//returns an array of memos with only those that report on the ships cargo included
	o = _.where(memoSet, {memoType: "Cargo"})
	return o
}
function filterToWarsAndFights(memoSet){
	//returns an array of memos with only those that report on the conflicts on board included
	o = _.where(memoSet, {memoType: "WarsAndFights"});
	return o
}
function filterToLifeOnBoard(memoSet){
	///returns an array of memos with only those that report on life on board included
	o= _.where(memoSet, {memoType: "LifeOnBoard"})
	return o
}
function filterToVoyageID(memoSet, voyageID){
	//returns an array of memos all belonging to the same voyage
	o= _.where(memoSet, {voyageID: String(voyageID)});
	return o
}
function filterToLocationID(memoSet, locationID){
	//returns an array of memos all belonging to the same location
	o= _.where(memoSet, {locationID: String(locationID)})
	return o
}
function filterToTimeRange(memoText, temporalFilter){
	//returns an array of memos whose dates fall between a min and amax specified value
	//temporal filter should be like {minDate: [date], maxDate: [date]}
	o = _.filter(memoSet, function(d){
		return (d.date > temporalFilter.minDate && d.date < temporalFilter.maxDate)
	})
}

function filterToHexBin(memoSet, hexbin){
	//returns an array of memos for a hex bin
	locs = []
	for (i in hexbin){
		v = hexbin[i]
		if (typeof v == 'object'){//hexbins have other properties that arent the location points
			locationID = String(v['locationID'])
			locs.push(locationID);
		}
	}
	o = _.filter(memoSet, function(d){
		return (locs.indexOf(String(d.locationID)) != -1)
	})
	return o
}

//change projection on widget change
$(".projSelect").change(function(){
	proj = $(this).val()
	changeProjection(proj)
})



function displayMemos(memoSet){
	//displays the feed of observations in the right hand panel
	$("#feed").empty()
	$("#feed-panel").show();
	d3.select("#feed").selectAll(".log")
		.data(memoSet)
		.enter()
		.append("li")
			.attr('class', 'log')
			.attr('class', 'list-group-item')
			.html(function(d){
				meta = lookupVoyageID(d['voyageID'])
				text = d.memoText;
				latitude = d.Latitude
				longitude = d.Longitude
				date = moment(d.date)
				meta = lookupVoyageID(d['voyageID'])
				captain = meta['captainName']
				captainRank = meta['rank']
				fromPlace = meta['fromPlace']
				toPlace = meta['toPlace']
				shipName = meta['shipName']
				shipType = meta['shipType']
				nationality = meta['nationality']
				voyageStart = moment(meta['voyageStart'])
				var duration = moment.duration(date.diff(voyageStart));
				var daysSinceStart = Math.abs(Math.round(duration.asDays()));
				
				//add this properties so we can access them on mouseover
				d['captainName'] = captain
				d['captainRank'] = captainRank
				d['observer'] = meta['captainName2']
				d['observerRank'] = meta['captainRank2']
				d['fromPlace'] = fromPlace
				d['toPlace'] = toPlace
				d['shipName'] = shipName
				d['shipType'] = shipType
				d['nationality'] = nationality
				d['voyageStart'] = voyageStart
				d['company'] = meta['company']
				d['voyageDaysSinceStart'] = daysSinceStart

				if (!captain || captain ==""){
					captain = "Unknown"
				}
				

				//img = lookupCaptainImage(captain);
				img = ""
				d.imgSrc = img
				formatDate = moment.weekdays()[date.weekday()] + ", " + date.date() + nth(date.date()) + " " + moment.months()[date.month() - 1] + ", " + date.year()
				//this is the feed entry
				html = "<div class='row log-row basic-hovercard' id='log_" + d.locationID + "'>"
				html += "<img src='" + img + "' class='captain-thumb col-xs-3'/>"
				html += "<div class='col-xs-9 log-header' id='header_" + d.locationID + "'>"
				html += "<h6 class='captain-heading' class='col-xs-12'>" + captainRank + " " + captain + "</h6>"
				html += "<small class='log-shipname col-xs-12 text-muted'>" + shipName + "</small>"
				html += "<i class='log-date col-xs-12 text-muted'>" + formatDate + "</i>"
				html += "<p class='log-entry'>" + text + "</p>"
				html += "</div>"
				html += "</div>"

				return html;
			}).on("mouseover", function(d) {
				console.log(d)
				//make the html
				html = "<div class='row'>"
				html += "<div class='col-xs-4'>"
				html += "<img class='captain-thumb img-rounded hover-img col-xs-12' src='" + d.imgSrc + "'>"
				html += "</div><div class='col-xs-8'>"
				html += "<h4>" + d.captainRank + " " + d.captainName + "</h4>"
				html += "<i><b class='large'>" + d.shipName + "</b></i><br />"
				html += "<i>" + d.shipType + "</i>"
				html += "<p>Voyage Started: " + d.voyageStart + "</p>"
				html += "<p>Sailing From: " + d.fromPlace + "</p>"
				html += "<p>Sailing To: " + d.toPlace + "</p>"
				html += "<p>Days at sea: " + d.voyageDaysSinceStart + "</p>"
				html += "<p>Sailing for: " + d.company + "</p>"
				if (d.captainName2){
					html += "<p>Second Observer: " + d.captainRank2 + " " + d.captainName2 + "</p>"
				}
				html += "</div>"
				

				
				//positioning
				pos = $(this).position();
				divPos = pos.top;
				console.log(divPos)
				
				d3.select(this).style('background-color','#cccccc')	 //highlight
					
	            globals.memoTooltip.transition()		
	                .duration(200)		
	                .style("opacity", .9);		
	            globals.memoTooltip.html(html)	
	                .style("left", "400px")		
	                .style("top", divPos + "px");	
            })					
        .on("mouseout", function(d) {	
        	d3.select(this).style('background-color','white')	//de highlight	
            globals.memoTooltip.transition()		 //remove
                .duration(500)		
                .style("opacity", 0);	
        });
			
}



//lookup functions
function lookupCaptainInfo(captainName){
	//returns an array of voyage objects that have the given captain
	o = _.where(globals.data.shipLookup, {
		captainName: captainName
	})
	return o
}
function lookupVoyageFrom(fromPlace){
	//returns an array of voyages that started at the given place
	o = _.which(globals.data.shipLookup, {
		where: fromPlace
	})
	return o
}

function lookupVoyageTo(toPlace){
	//returns an array of voyages that end at the given place
	o = _.where(globals.data.shipLookup, {
		toPlace: toPlace
	})
	return o
}
function lookupShipName(shipName){
	//returns an array of voyages taken by a given ship
	o = _.where(globals.data.shipLookup, {
		shipName: shipName
	})
	return o
}
function lookupCompany(company){
	//returns an array of voyages made by ships of a given company
	o = _.where(globals.data.shipLookup,{
		companyName: company
	})
	return o
}
function lookupShipType(shipType){
	//returns an array of voyages made by ships of a given type
	o = _.where(globals.data.shipLookup, {
		shipType: shipType
	})
	return o
}

function lookupVoyageID(voyageID){
	//returns voyage metadata matching the given voyageID --> should only be one
	o = _.where(globals.data.shipLookup, {
		voyageID: voyageID
	});
	return o[0]
	
}

function nth(d) {
	//formats ordinal numbers --> 1st, 2nd, 3rd etc
  if(d>3 && d<21) return 'th'; 
  switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
} 

function loadCaptainMetadata(){
	d3.csv("/assets/data/captain_metadata.csv", function(data){
		globals.data.captain_metadata = data;
	})
}
function lookupCaptainImage(captainName){
	//lookup the image for this captain from the lookup file
	o = _.findWhere(globals.data.captain_metadata, {captainName: captainName});
	if (o){
		return o.Image;
	}else{
		return "assets/img/default.jpg"
	}
}

function getSummaryOfHex(hexbin){
	//returns an object with the aggregate weather summary from this hex bin
	props = {}
	props['centroidx'] = hexbin.x
	props['centroidy'] = hexbin.y
	props['numInBin'] = hexbin.length
	props['fog'] = 0
	props['snow'] = 0
	props['gusts'] = 0
	props['thunder'] = 0
	props['hail'] = 0
	props['rain'] = 0
	props['seaIce'] = 0
	props['meanAirTemp'] = 0;
	props['meanPressure'] = 0;
	props['meanSST'] = 0;
	props['numAirTemp'] = 0;
	props['numPressure'] = 0;
	props['numSST'] = 0;
	props['numWindSpeed'] = 0;
	props['meanWindSpeed'] = 0;
	props['numWindDirection'] = 0;
	props['meanWindDirection'] = 0;
	for (item in hexbin){
		v = hexbin[item]
		if (typeof(v) == "object"){//make sure we are looking at the actual data objects not the hex metadata
			if (v['fog'] == "True"){//these are still strings not booleans 
				props['fog'] += 1;
			}
			if (v['snow'] == "True"){
				props['snow'] += 1;
			}
			if (v['gusts'] == "True"){
				props['gusts'] += 1;
			}
			if(v['thunder'] == "True"){
				props['thunder'] += 1;
			}
			if (v['hail'] == 'True'){
				props['hail'] +=1;
			}
			if(v['seaIce'] == "True"){
				props['seaIce'] += 1;
			}
			if (v['rain'] == "True"){
				props['rain'] += 1;
			}
			if (v['airTemp'] != -1){
				props['numAirTemp'] += 1;
				props['meanAirTemp'] += v['airTemp']
			}
			if(v['pressure'] != -1){
				props['numPressure'] +=1 ;
				props['meanPressure'] += v['pressure']
			}
			if(v['sst'] != -1){
				props['numSST'] += 1;
				props['meanSST'] += v['sst']
			}
			if(v['windSpeed'] != -1){
				props['numWindSpeed'] +=1;
				props['meanWindSpeed'] += v['windSpeed']
			}	
			if(v['winddirection'] > 0 && v['winddirection'] < 360){
				props['numWindDirection'] +=1;
				props['meanWindDirection'] += v['winddirection']
			}
		}
	} //end for loop
	//correct the means, but don't divide by zero
	if (props['numAirTemp'] != 0){
		props['meanAirTemp'] = props['meanAirTemp'] / props['numAirTemp']
	}else{
		props['meanAirTemp'] = false;
	}
	if (props['numPressure'] != 0){
		props['meanPressure'] = props['meanPressure'] / props['numPressure']
	}else{
		props['meanPressure'] = false;
	}
	if (props['numSST'] != 0){
		props['meanSST'] = props['meanSST'] / props['numSST']
	}else{
		props['meanSST'] = false;
	}
		if (props['numWindSpeed'] != 0){
		props['meanWindSpeed'] = props['meanWindSpeed'] / props['numWindSpeed']
	}else{
		props['meanWindSpeed'] = false;
	}
	if (props['numWindDirection'] != 0){
		props['meanWindDirection'] = props['meanWindDirection'] / props['numWindDirection']
	}else{
		props['meanWindDirection'] = false;
	}
	return props
}

function enterIsolationMode(){
	globals.map.mapContainer.append("rect")
		.attr('height', globals.map.dimensions.height)
		.attr('width', globals.map.dimensions.width)
		.attr('class', 'overlay').on('click', exitIsolationMode)
	globals.isolationMode = true
	$("#feed-window").removeClass('display-none')
	$("#feed-controls").removeClass('display-none')
}
function exitIsolationMode(){
	d3.selectAll(".overlay")
		.remove()
	d3.selectAll('.isolated').style('stroke', 'none').classed('isolated', false)
	globals.isolationMode = false;
	console.log("Exited isolation mode.")
	$("#feed").empty();
	$("#feed-window").addClass('display-none')
	$("#feed-controls").addClass('display-none')
	
}

function createSummaryBarchart(){
	$("#wind-rose").empty()
   	globals.wind_diagram = {}
   	globals.wind_diagram.margins = {top: 15, right: 50, bottom: 50, left: 50}
   	globals.wind_diagram.dimensions = {
   		height: $("#wind-rose").height() - globals.wind_diagram.margins.top - globals.wind_diagram.margins.bottom, 
   		width: $("#wind-rose").width() - globals.wind_diagram.margins.left - globals.wind_diagram.margins.right,
   		radius:($("#wind-rose").height()) / 2
   	}
   	globals.wind_diagram.diagram = d3.select("#wind-rose").append('svg')
   		.attr('height', globals.wind_diagram.dimensions.height + globals.wind_diagram.margins.top + globals.wind_diagram.margins.bottom)
   		.attr('width', globals.wind_diagram.dimensions.width + globals.wind_diagram.margins.left + globals.wind_diagram.margins.right)
   		.append("g")
   			 .attr("transform", "translate(" + globals.wind_diagram.margins.left + "," + globals.wind_diagram.margins.top + ")");
   			 
   	globals.wind_diagram.scale = d3.scale.linear()
   		.domain([0, 25])
   		.range([0, globals.wind_diagram.dimensions.radius])
   	
   	//this is the mean wind arrow
   	globals.wind_diagram.compassPath = globals.wind_diagram.diagram.
   		append('line')
   		.attr('x1', globals.wind_diagram.dimensions.width / 2)
   		.attr('x2', globals.wind_diagram.dimensions.width / 2)
   		.attr('y1', globals.wind_diagram.dimensions.height / 2)
   		.attr('y2', globals.wind_diagram.dimensions.height / 2)
   	globals.wind_diagram.diagram.append("circle") //center circle
   		.attr('cx', globals.wind_diagram.dimensions.width / 2)
   		.attr('cy', globals.wind_diagram.dimensions.height / 2)
   		.attr('r', 5)
   		.style('fill', 'darkred')    
   	
   	x_axis = d3.svg.axis()
   		.scale(globals.wind_diagram.wind)
   		.ticks(2)
   		.orient('left')
   	
  
  ////axis stuff 	
   	globals.wind_diagram.axis_group = globals.wind_diagram.diagram.append('g')
   	globals.wind_diagram.axis_group
   		.append('line')
	   		.attr('y1', 0)
	   		.attr('y2', -globals.wind_diagram.scale(10))
	   		.attr('x1', 0)
	   		.attr('x2', 0)
	   		.attr('stroke', 'black')
	   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')')   	
   	globals.wind_diagram.axis_group.append('line')
   		.attr('y1', 0)
   		.attr('y2', 0)
   		.attr('x1', 0)
   		.attr('x2', globals.wind_diagram.scale(10))
   		.attr('stroke', 'black')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')')
   	globals.wind_diagram.axis_group.append('line')
   		.attr('y1', 0)
   		.attr('y2', globals.wind_diagram.scale(10))
   		.attr('x1', 0)
   		.attr('x2', 0)
   		.attr('stroke', 'black')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')')
   	globals.wind_diagram.axis_group.append('line')
   		.attr('y1', 0)
   		.attr('y2', 0)
   		.attr('x1', 0)
   		.attr('x2', -globals.wind_diagram.scale(10))
   		.attr('stroke', 'black')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')')
   	
   	//labels
   	globals.wind_diagram.diagram.append('g')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')')
   		.append('text')
   			.attr('x', 0)
   			.attr('y', -globals.wind_diagram.scale(12))
   			.attr('text-anchor', 'middle')
   			.text('N')
   
   globals.wind_diagram.diagram.append('g')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')').append('text')
   			.attr('y', +5)
   			.attr('x', globals.wind_diagram.scale(12))
   			.attr('text-anchor', 'begin')
   			.text('E')
  
	globals.wind_diagram.diagram.append('g')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')').append('text')
   			.attr('x', 0)
   			.attr('y', globals.wind_diagram.scale(13))
   			.attr('text-anchor', 'middle')
   			.text('S')
   			
   	   	globals.wind_diagram.diagram.append('g')
   		.attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')').append('text')
   			.attr('y', +5)
   			.attr('x', -globals.wind_diagram.scale(12))
   			.attr('text-anchor', 'end')
   			.text('W')
   	
   	//test
   		x1 = globals.wind_diagram.dimensions.width / 2
	x2 = x1
	
	y1 = globals.wind_diagram.dimensions.height / 2
   
   	for (var i=0; i< 360; i=i+45){
			globals.wind_diagram.diagram.append('line')
				.attr('class', 'wind-path')
				.attr('x1', x1)
				.attr('x2', x1)
				.attr('y1', (globals.wind_diagram.dimensions.height / 2))
				.attr('y2', (globals.wind_diagram.dimensions.height / 2) + globals.wind_diagram.scale(45))
				.style('stroke', 'gray')
				.style('stroke-width', 0.5)
				.attr('transform', 'rotate(-' + i + ' ' + x1 + "," + y1 + ')')
	   	globals.wind_diagram.diagram.append('text')
				.attr('class', 'wind-path')
				.attr('x', x1)
				.attr('y', (globals.wind_diagram.dimensions.height / 2) + globals.wind_diagram.scale(18))
				.style('fill', 'black')
				.text(i)
				.attr('transform', 'rotate(' + (180 + i) + ' ' + x1 + "," + y1 + ')')
				.style("text-anchor", 'middle')
    			//.attr("transform", function(i) { return i < 270 && i > 90 ? "rotate(180 " + ((globals.wind_diagram.dimensions.height / 2) + globals.wind_diagram.scale(12) + 6) + ",0)" : null; })
   	}
   		
   	
   	// //polar plot type axes
   	// var gr = globals.wind_diagram.diagram.append("g")
   	// .attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + "," + globals.wind_diagram.dimensions.height/2 + ')')
	    // .attr("class", "r axis")
	  // .selectAll("g")
	    // .data(globals.wind_diagram.scale.ticks(5).slice(1))
	  // .enter().append("g");
// 	
	// gr.append("circle")
	    // .attr("r", globals.wind_diagram.scale);
// 
// 	
	// gr.append("text")
	    // .attr("y", function(d) { return -globals.wind_diagram.scale(d)-4; })
	    // .attr("transform", "rotate(45)")
	    // .style("text-anchor", "middle")
	    // .text(function(d) { return d; });
// // 
	// var ga = globals.wind_diagram.diagram.append("g")
		// .attr('transform', 'translate(' + globals.wind_diagram.dimensions.width/2 + ',' + globals.wind_diagram.dimensions.height/2 + ')')
	    // .attr("class", "a axis")
	  // .selectAll("g")
	    // .data(d3.range(0, 360, 90))
	  // .enter().append("g")
	    // .attr("transform", function(d) { return "rotate(" + -d + ")"; });
// // 	
	// ga.append("line")
	    // .attr("x2", globals.wind_diagram.dimensions.radius);
// 	
	// ga.append("text")
	    // .attr("x", globals.wind_diagram.dimensions.radius + 6)
	    // .attr("dy", ".35em")
	  	// .style("text-anchor", function(d) { return d < 270 && d > 90 ? "end" : null; })
	    // .attr("transform", function(d) { return d < 270 && d > 90 ? "rotate(180 " + (globals.wind_diagram.dimensions.radius + 6) + ",0)" : null; })
	    // .text(function(d) { //hacky hacky hacky
	    	// if (d == 0){
	    		// return "E";
	    	// }else if (d == 90){
	    		// return "N";
	    	// }else if (d == 180){
	    		// return "W";
	    	// }else if (d == 270){
	    		// return "S"
	    	// }});// 
	    	
	globals.wind_diagram.windPaths = globals.wind_diagram.diagram.append('g')

}

function displayWindSpeed(hexbin){
		//do the wind compass
		
		//this is the arrowhead
	var defs = globals.wind_diagram.diagram.append('defs')
    defs.append("svg:marker")
            .attr("id", "arrowGray")
            .attr("viewBox","0 0 10 10")
            .attr("refX","0")
            .attr("refY","5")
            .attr("markerUnits","strokeWidth")
            .attr("markerWidth","4")
            .attr("markerHeight","6")
            .attr("orient","auto")
            .append("svg:path")
            .attr("d","M 0 0 L 10 5 L 0 10 z")
            .attr("fill", "black");
    
    //calculate mean wind from hexbin
    meanWind = d3.mean(hexbin, function(d){return d.windSpeed})
    meanDir = d3.mean(hexbin, function(d){return d.winddirection})
    
    	//keep x1 and x2 the same, vary the height based on speed and then rotate based on direction
	x1 = globals.wind_diagram.dimensions.width / 2
	x2 = x1
	
	y1 = globals.wind_diagram.dimensions.height / 2
	y2 = (globals.wind_diagram.dimensions.height / 2) + globals.wind_diagram.scale(meanWind)
   
	
	//this is all the other winds
	globals.wind_diagram.windPaths.selectAll(".wind-path").remove()
	for (var i=0; i< hexbin.length; i++){
		bin = hexbin[i]
		speed = bin.windSpeed;
		dir = bin.winddirection;
		if ((speed) && (dir)){
			globals.wind_diagram.windPaths.append('line')
				.attr('class', 'wind-path')
				.attr('x1', x1)
				.attr('x2', x1)
				.attr('y1', (globals.wind_diagram.dimensions.height / 2))
				.attr('y2', (globals.wind_diagram.dimensions.height / 2) + globals.wind_diagram.scale(speed))
				.style('stroke', 'steelblue')
				.style("stroke-opacity", 0.5)
				.style('stroke-width', 0.5)
				.attr('transform', 'rotate(' +  (180 + dir) + ' ' + x1 + "," + y1 + ')')
		}
	}
	
		// //this is average wind
	windCompass = globals.wind_diagram.compassPath
			.attr('y1', y1)
			.attr('y2', y2)
			.style('stroke', 'black')
			.style('stroke-width', 2)
			.attr("marker-end", "url(#arrowGray)")
			.attr('transform', 'rotate(' +  (180 + meanDir) + ' ' + x1 + "," + y1 + ')')
	windCompass.moveToFront()
			
			
	
}

function displaySummary(props){
	if (props['meanAirTemp']){
		$("#airTempText").text(Math.round(props['meanAirTemp']))
	}else{
		$("#airTempText").text("--")
	}
	if (props['meanPressure']){
		$("#pressureText").text(Math.round(props['meanPressure']))
	}else{
		$("#pressureText").text("--")
	}
	attrs = [
		{type: "fog", value: +props['fog']},
		{type: "gusts", value: +props['gusts']},
		{type: "snow", value: +props['snow']},
		{type: "rain", value: +props['rain']},
		{type: "hail", value: +props['hail']},
		{type: "thunder", value: +props['thunder']},
		{type: "seaIce", value: +props['seaIce']}
	]
	maxAttr = _.max(attrs, function(d){
		return d.value
	})
	if (maxAttr.value != 0){
		$("#commonText").text(maxAttr.type.toProperCase())
		$("#numCommon").text(Math.round(maxAttr.value/props['numInBin'] * 100) + '%')
	}else{
		$("#commonText").text("--")
		$("#numCommon").text("--%")
	}
	if(props.meanWindSpeed != 0){
		$("#wsText").text(Math.round(props.meanWindSpeed))
	}else{
		$("#wsText").text("--")
	}
	if(props.meanWindDirection != 0){
		$("#wdText").text(Math.round(props.meanWindDirection))
	}else{
		$("#wdText").text("--")
	}
	
}






function changeMemoSet(){
	v = $(this)
	memoType = v.val()
	globals.memoType = memoType
	if (memoType == "All"){
		globals.filteredMemos = globals.data.memos
	}else if (memoType == "Biology"){
		globals.filteredMemos = filterToBiology(globals.data.memos)
	}else if (memoType == "WeatherReports"){
		globals.filteredMemos=filterToWeatherReports(globals.data.memos)
	}else if (memoType == "cargo"){
		globals.filteredMemos = filterToCargo(globals.data.memos)
	}else if (memoType == "warsAndFights"){
		globals.filteredMemos = filterToWarsAndFights(globals.data.memos)
	}else if (memoType == "shipAndRig"){
		globals.filteredMemos = filterToShipAndRig(globals.data.memos)
	}else if(memoType == "other"){
		globals.filteredMemos = filterToOther(globals.data.memos)
	}else if(memoType == "lifeOnBoard"){
		globals.filteredMemos = filterToLifeOnBoard(globals.data.memos)
	}else if (memoType == "Travel"){
		globals.filteredMemos = filterToTravel(globals.data.memos)
	}else if (memoType == "enc"){
		globals.filteredMemos = filterToEncounter(globals.data.memos)
	}else if (memoType == 'anchor'){
		globals.filteredMemos = filterToAnchored(globals.data.memos)
	}else if(memoType == "landmarks"){
		globals.filteredMemos = filterToLandmarks(globals.data.memos)
	}
	console.log(globals.filteredMemos)
}
$(".memoSelect").change(changeMemoSet)



$("#minimize-wx-panel").on('click', function(){
	if ($("#wx-panel-glyph").hasClass("glyphicon-plus")){
		$("#summary-window").removeClass('display-none')
	}else{
		setTimeout(function(){$("#summary-window").addClass('display-none')}, 500)
	}
	$("#text-summary").slideToggle(500)
	$("#wind-summary").slideToggle(500)
	$("#wind-rose").slideToggle(500, 'linear', function(){})
	
	$("#wx-panel-glyph").toggleClass("glyphicon-plus").toggleClass('glyphicon-minus')
})

$("#minimize-feed-panel").on('click', function(){
	if ($("#feed-panel-glyph").hasClass("glyphicon-plus")){
		$("#feed-window").removeClass('display-none')
	}else{
		setTimeout(function(){$("#feed-window").addClass('display-none')}, 500)
	}
	$("#feed").slideToggle(500)
	
	$("#feed-panel-glyph").toggleClass("glyphicon-plus").toggleClass('glyphicon-minus')
})



function round2(num){
	//rounds to at most two decimal places
	return Math.round(num * 100) / 100;
}


function filterByFog(data){
	f = _.where(data, {fog : "True"});
	return f;
}

function filterByGusts(data){
	f = _.where(data, {gusts : "True"});
	return f;
}

function filterByHail(data){
	f = _.where(data, {hail : "True"});
	return f;
}

function filterByRain(data){
	f = _.where(data, {rain : "True"});
	return f;
}

function filterBySeaIce(data){
	f = _.where(data, {seaIce : "True"});
	return f;
}

function filterBySnow(data){
	f = _.where(data, {snow : "True"});
	return f;
}

function filterByThunder(data){
	f = _.where(data, {thunder : "True"});
	return f;
}


function binWindDirection(num){
	if (num >= 337.5 || num < 22.5) {
		windDir = "N"
	} else if (num >= 22.5 && num < 67.5) {
		windDir = "NE"		
	} else if (num >= 67.5 && num < 112.5){
		windDir = "E"
	} else if (num >= 112.5 && num < 157.5){
		windDir = "SE"
	} else if (num >= 157.5 && num < 202.5){
		windDir = "S"
	} else if (num >= 202.5 && num < 247.5) {
		windDir = "SW"
	} else if (num >= 247.5 && num < 292.5) {
		windDir = "W"
	} else if (num >= 292.5 && num < 337.5) {
		windDir = "NW"
	}
	return windDir
}
//control hex bin size

function filterWindSpeed(minSpeed, maxSpeed, data) {
	f = _.filter(data, function(element){
		if (element.windSpeed >= minSpeed && element.windSpeed <= maxSpeed) 	
			return true;	 	
})		
		return f;
}

function filterDate(minDate, maxDate, data) {
	f = _.filter(data, function(element){
		return ((element.date >= minDate) && (element.date <= maxDate));
	}); 	
		return f;
}

function filterMonth(minMonth, maxMonth, data) {
	f = _.filter(data, function(element){
		if (element.month >= minMonth && element.month <= maxMonth) 	
			return true;	 	
})		
		return f;
}

function filterSST(data) {
	f = _.filter(data, function(element){
		if (element.sst > -1) 	
			return true;	 	
})		
		return f;
}

//this function just returns whether AirTemp recorded
function filterAirTemp(data) {
	f = _.filter(data, function(element){
		if (element.airTemp > -1) 	
			return true;	 	
})		
		return f;
}

//this function takes AirTemp min and max
function filterByAirTemp(minTemp, maxTemp, data) {
	f = _.filter(data, function(element){
		if (element.airTemp >= minTemp && element.airTemp <= maxTemp) 	
			return true;	 	
})		
		return f;
}

//this function just returns whether Pressure recorded
function filterPressure(data) {
	f = _.filter(data, function(element){
		if (element.pressure > -1) 	
			return true;	 	
})		
		return f;
}

//this function takes Pressure min and max
function filterByPressure(minPressure, maxPressure, data) {
	f = _.filter(data, function(element){
		if (element.pressure >= minPressure && element.pressure <= maxPressure) 	
			return true;	 	
})	
		console.log(f)	
		return f;
}

// nav tabs
$(".nav-item").hover(function(){
	$(this).toggleClass('nav-hovered')
}, function(){
	$(this).toggleClass('nav-hovered')
})
$(".nav-item").click(function(){
	//control active tab css
	$(".nav-item").removeClass("active")
	$(this).addClass("active")
	//figure out what to display
	$(".nav-panel").css({'display': "none"})
	_thisData = $(this).data('panel')
	if (_thisData == 'intro'){
		$("#intro-panel").slideToggle()
	}else if (_thisData == "weather"){
		$("#weather-panel").slideToggle()
	}else if (_thisData == "wind"){
		$("#wind-panel").slideToggle()
	}else if (_thisData == "time"){
		$("#time-panel").slideToggle()
	}else if (_thisData == "feed"){
		$("#feed-panel").slideToggle()
	}else{
		return
	}
})


function filterToDate(date){
	toCheck = date.toDateString()
	o = _.filter(globals.data.ships, function(d){
		return (toCheck == d.date.toDateString())
	})
	return o
}

function filterToYear(year){
	console.log(year)
	o = _.filter(globals.data.ships, function(d){
		return (year == d.date.getFullYear())
	})
	console.log(o)
	return o
}

function filterToMonthOfYear(month, year){
	month = month - 1;
	console.log(month)
	console.log(year)
	o  = _.filter(globals.data.ships, function(d){
		return ((month == +d.date.getMonth()) && (year == +d.date.getFullYear()))
	})
	return o
}



function sequenceByDay(date){
	//this function sequences through the map, giving a day by day view of the events as they unfold
	removeHexes()
	globals.data.filteredShips = filterToDate(date);
	console.log(globals.data.filteredShips.length)
	displayShipDataHexes(globals.data.filteredShips)
}

function sequenceByYear(year){
	removeHexes()
	globals.data.filteredShips = filterToYear(year)
	console.log(globals.data.filteredShips.length)
	displayShipDataHexes(globals.data.filteredShips)
}
function sequenceByMonthOfYear(month, year){
	removeHexes()
	globals.data.filteredShips = filterToMonthOfYear(month, year)
	console.log(globals.data.filteredShips.length)
	displayShipDataHexes(globals.data.filteredShips)
}

function playThroughDateRange(minDate, maxDate){
	function getDates( d1, d2 ){
	  var oneDay = 24*3600*1000;
	  for (var d=[],ms=d1*1,last=d2*1;ms<last;ms+=oneDay){
	    d.push( new Date(ms) );
	  }
	  return d;
	}
	dates = getDates(minDate, maxDate);
	for (var i=0; i< dates.length; i++){
		day = dates[i]
		sequenceByDay(day)
	}
}


//called from temporal filter function
function updateTimeline(min, max){

	$("#timeline").empty();

	var height = $("#timeline").height();
	var width = $("#timeline").width();

    //create a second svg element to hold the bar chart
    var timescale = d3.select("#timeline")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "timescale");

	// define the x scale (horizontal)
   	var mindate = min,
       	maxdate = max
            
    var xScale = d3.time.scale()
        .domain([mindate, maxdate])   // date values
		.range([0, width]);   // map these the the chart width = total width minus padding at both sides
        
    // define the y axis
    var xAxis = d3.svg.axis()
        .orient("bottom")
        .scale(xScale);
    
    // draw x axis with labels and move to the bottom of the chart area
    timescale.append("g")
        .attr("class", "xaxis")   // give it a class so it can be used to select only xaxis labels  below
        .attr("transform", "translate(0," + (height/2) + ")")
        .call(xAxis);

};

$(function() {
    $( "#time-range" ).slider({
      range: true,
      min: 1750,
      max: 1850,
      values: [ 1750, 1850 ],
      stop: function( event, ui ) {
      	console.log(ui.values[0])
      	console.log(ui.values[1])
      	minDate = new Date(ui.values[0], 0, 1)
      	maxDate = new Date(ui.values[1], 0, 1)
      	console.log(minDate)
      	console.log(maxDate)
        removeHexes()
        globals.data.filteredShips = filterDate(minDate, maxDate, globals.data.ships);
        displayShipDataHexes(globals.data.filteredShips);
        updateTimeline(minDate, maxDate)
      }
    });
});

