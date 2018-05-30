//GEOG575, Lab2: D3 Coordinated Visualization. May 2018.
//Wrap in self-executing annonymous function to move to local scope
(function(){

    //pseudo-global variables
    //list of attributes
    var attrArray = ["fuel97", "fuel02", "fuel07", "fuel12", "fert97", "fert02", "fert07", "fert12"]; 
    //list of labels for attributes
    var attrNames = {fuel97:"Fuel Expense, 1997", fuel02:"Fuel Expense, 2002", fuel07:"Fuel Expense, 2007",
                     fuel12:"Fuel Expense, 2012",fert97:"Fertilizer Expense, 1997", fert02:"Fertilizer Expense, 2002", fert07:"Fertilizer Expense, 2007", fert12:"Fertilizer Expense, 2012"} 
    //list of attribute meta info
    var opLabel = {fuel97:"Total Operations: 79,527 (Total Expenses per Operation: $55,711)", 
                   fuel02:"Total Operations: 77,133 (Total Expenses per Operation: $60,185)", 
                   fuel07:"Total Operations: 78,463 (Total Expenses per Operation: $86,011)", 
                   fuel12:"Total Operations: 69,754 (Total Expenses per Operation: $135,035)", 
                   fert97:"Total Operations: 79,527 (Total Expenses per Operation: $55,711)", 
                   fert02:"Total Operations: 77,133 (Total Expenses per Operation: $60,185)", 
                   fert07:"Total Operations: 78,463 (Total Expenses per Operation: $86,011)", 
                   fert12:"Total Operations: 69,754 (Total Expenses per Operation: $135,035)"};
    //initial attribute
    var expressed = attrArray[0]; 
    
    //chart frame dimensions
    var chartWidth = window.innerWidth*0.425,
        chartHeight = 473,
        leftPadding=50,
        rightPadding=2,
        topBottomPadding=5,
        chartInnerWidth=chartWidth-leftPadding-rightPadding,
        chartInnerHeight=chartHeight-topBottomPadding*2,
        translate="translate("+leftPadding+","+topBottomPadding+")";
    
   //create scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0,7000]);
    
    //begin script when window loads
    window.onload = setMap();
    
    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth*0.5,
            height = 500;
    
        //create new svg container for map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        //create Albers equal area conic projection centered on WI: **CHECK VALUES...**
        var projection = d3.geoAlbers()
            .center([2.00, 32.00]) //lon,lat; center of plane
            .rotate([91.00, -12.95, -1.45]) //lon,lat,roll; angles to rotate globe
            .parallels([22.23, 43.78]) //Std. parallels of conic projection (tangent=2-values are same, secant=2=values not same)
            .scale(5000) //factor distances are multiplied, incr or decr scale of map
            .translate([width/2, height/2]); //offsets pixel coords of center, 1/2 svg width/height to keep map centered
    
        //create path generator
        var path = d3.geoPath()
            .projection(projection);
    
        var dataL2 = d3.map();
    
        //use d3.queue to parallelize asynchonrous data loading
        d3.queue()
            .defer(d3.csv, "data/dataL2.csv") //load attributes from csv
            .defer(d3.json, "data/wico.topojson") // load choropleth spatial data
            .await(callback); //fires when all data loaded, sends to callback function
    
        function callback(error, csvData, wiCo){
            console.log(error);

            //translate topojson, ..objects.<info from file after "objects":"___">);
            var wiCoall = topojson.feature(wiCo, wiCo.objects.wico).features;
            //console.log(wiCoall);
            
            wiCoFin = joinData(wiCoall, csvData);
            console.log(wiCoFin);
            
            var colorScale = makeColorScale(csvData); //create color scale
            
            setEnumerationUnits(wiCoFin, map, path, colorScale);
            
            //add coordinated visualization to map
            setChart(csvData, colorScale);
            
            //add dropdown menu for attribute selection
            createDropdown(csvData);
        
        }; //end of callback()
    }; //end of setMap()
    
    function joinData(wiCoall, csvData) {
        
        //loop through csv to assign attribute values to geojson county
        for (var i=0; i<csvData.length; i++){
            var csvCo = csvData[i]; //current county name
            var csvKey = csvCo.COUNTYNAME; //csv primary key
            
            //loop through geojson counties to find correct county
            for (var a=0; a<wiCoall.length; a++){
                var geojsonProps = wiCoall[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.COUNTYNAME;
                
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
                    
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCo[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return wiCoall;
    };
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = ["#ffffb2","#fecc5c","#fd8d3c","#f03b20","#bd0026"];
        
        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);
        
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
        
        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);
        
        return colorScale;
    };
    
    //function to test for data value and return color
    function choropleth(props, colorScale){
        //verify attribute value is a number
        var val = parseFloat(props[expressed]);
        //if exist, assign a color; not, assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        }else{
            return "#CCC";
        };
    };
    
    function setEnumerationUnits(wiCoFin, map, path, colorScale){
        var counties = map.selectAll(".counties")
            .data(wiCoFin)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "name "+d.properties.COUNTYNAME;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties)
            })
            .on("mousemove", moveLabel);
        
        //add style descriptor to each rect
        var desc = counties.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.75px"}')
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
        
        var chartBackground=chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        //set bars for each county
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a,b){
                return b[expressed]-a[expressed];
            })
            .attr("class", function(d){
                return "bar "+d.COUNTYNAME;
            })
            .attr("width", chartInnerWidth/csvData.length-1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
        
        //add style descriptor to each path
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //chart title
        var chartTitle = chart.append("text")
            .attr("x", 60)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " +expressed[3]+" in each county");
        
        //create vertical axis generator
        var yAxis = d3.axisLeft(yScale)
            .scale(yScale);
        
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
        
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //Where chart numbers block was
        
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    }; //end of setChart()
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData);
            });
        
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Reported Expense");
        
        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d; })
            .text(function(d){ return attrNames[d] });
    };
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        console.log("in changeAttribute");
        //change the expressed attribute
        expressed = attribute;
        
        //get max value of attribute
        var max = d3.max(csvData, function(d){ return +d[expressed]; });
        
        //Set max domain
        if (expressed == attrArray[2]){
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0, 10000]);
        } else if (expressed == attrArray[3]){
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0,18000]);
        } else if (expressed == attrArray[4]){
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0,22000]);
        } else if (expressed == attrArray[5]){
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0,22000]);
        } else if (expressed == attrArray[6]){
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0,35000]);
        } else if (expressed == attrArray[7]){
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0,90000]);
        } else {
            yScale = d3.scaleLinear()
                .range([463,0])
                .domain([0,7000]);
        };

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var counties = d3.selectAll(".name")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            });
                
        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a,b){
                return b[expressed]-a[expressed];
            })
            .transition() //add animation
            .delay(function(d,i){
                return i*20
            })
            .duration(500);
        
        //attribute meta info
        var metaLabel = d3.select("#metainfo").text(opLabel[expressed]);
        console.log(metaLabel);
        
        updateChart(bars, csvData.length, colorScale);
                
    }; //end of changeAttribute
    
    //function to position, size, and color bars in chart
    function updateChart(bars,n,colorScale){
        //position bars
        bars.attr("x", function(d,i){
                return i*(chartInnerWidth/n)+leftPadding;
            })
            //size/resize bars
            .attr("height", function(d,i){
                return 463-yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d,i){
                return yScale(parseFloat(d[expressed]))+topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d,colorScale);
            });
        
        //add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(attrNames[expressed]);
        
        //update vertical axis labels
        var yAxis = d3.axisLeft(yScale)
            .scale(yScale);
        d3.selectAll("g.axis")
            .call(yAxis);
    };
    
    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("."+props.COUNTYNAME)
            .style("stroke", "yellow")
            .style("stroke-width", "2");
        //call dynamic label
        setLabel(props);
    };
    
    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("."+props.COUNTYNAME)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
        
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
            
            var styleObject = JSON.parse(styleText);
            
            return styleObject[styleName];
        };
        
        //remove label
        d3.select(".infolabel")
            .remove();
    };
    
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>$"+props[expressed]+"</h1><b>"+attrNames[expressed]+"</b>";
        
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.COUNTYNAME+"_label")
            .html(labelAttribute);
        
        var cntyName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.COUNTYNAME);
    };
    
    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
        
        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;
        
        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1;
        
        d3.select(".infolabel")
            .style("left", x+"px")
            .style("top", y+"px");
    };
})(); //eo script
