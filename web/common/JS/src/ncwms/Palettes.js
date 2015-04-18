goog.provide('owgis.ncwms.palettes');

goog.require('owgis.utils');
goog.require('owgis.constants');
goog.require('owgis.ncwms.animation');
goog.require('owgis.ncwms.calendars');
goog.require('owgis.ogc');
goog.require('owgis.ajax');

var initialMaxPal;//default maxPalVal
var initialMinPal;//default minPalVal
var urlPaletteImg;//this variable is used to get the first original url

/**
 * This function updates the min
 * and max text fields and reloads the 
 * main layer with the appropiate color range
 * @param minMaxTxt - value of minimim and maximium colors
 */
function updateMinMaxFromJson(minMaxTxt){
	owgis.interf.loadingatmap(false);

    var jsonMinMax = eval("("+minMaxTxt+")");
    $('#minPal').val(parseFloat(jsonMinMax["min"]).toPrecision(4) - 1); 
    $('#maxPal').val(parseFloat(jsonMinMax["max"]).toPrecision(4) + 1);
    UpdatePalette(mappalette);
}

/**
 * This function request the min and max value for the
 * current layer and updates the color range.
 * When the user clicks the auto button. 
 */
function setColorRangeFromMinMax(){
	owgis.interf.loadingatmap(true);

    var urlParams = {

        request:"GetMetadata",
        version:owgis.ogc.wmsversion,
        layers: layerDetails['name'],
        width: "10",//Hardcoded it doesn't work without width and Height
        height: "10",
        item:'minmax',
        bbox: layerDetails['bbox'].toString(),
        srs: layerDetails['srs']
    };

	var currTime = owgis.ncwms.calendars.getCurrentlySelectedDate('yy-mm-dd');
	if( currTime !== owgis.constants.notimedim ){
        urlParams.time = currTime;
	}

    //Verify that the layer has more than one zaxis option
    if(layerDetails.zaxis !== undefined){
        urlParams.elevation = layerDetails.zaxis.values[elev_glob_counter];
    }

    var url = layerDetails["server"]+"?"+owgis.utils.paramsToUrl(urlParams);

	owgis.ajax.crossorigin(url,updateMinMaxFromJson);
}

/**
 * Fills the dropdown menu that contains the available palettes
 */
owgis.ncwms.palettes.loadPalettes = function(){
    
    //Copied from loadDefault
    urlPaletteImg = $('#imgPalette').attr("src");

    minPalVal = layerDetails.scaleRange[0];
    maxPalVal  = layerDetails.scaleRange[1];

    initialMaxPal = maxPalVal;
    initialMinPal = minPalVal;

    //The 'default' style is defined in the MapViewerServlet
    origpalette = mappalette;
    
    if(mappalette == 'default' ||  mappalette == ''){
        mappalette = layerDetails.defaultPalette;
        $('#imgPalette').attr("src", $('#imgPalette').attr("src").replace(origpalette,mappalette));
    }

    //Inserts the optional palettes in a table
    var tableRow = $('#palettesTable')[0].insertRow(0);

    for (var key in layerDetails.palettes) {
        palstr = layerDetails.palettes[key];

        var td = document.createElement('td');
        td.setAttribute('onclick',"UpdatePalette('"+palstr+"');");
        td.innerHTML = "<img class='optPaletteImg' src='"+paletteUrl.replace(origpalette,palstr)+"' /></td>";
        tableRow.appendChild(td);
    }

    $('#minPal').val( parseFloat(minPalVal).toPrecision(4)); 
    $('#maxPal').val( parseFloat(maxPalVal).toPrecision(4));
}


/**
 * Replaces the image of the palette used
 */
function UpdatePalette(newPal){
    //alert("mapaalette: " + mappalette);
    $('#imgPalette').attr("src", $('#imgPalette').attr("src").replace(mappalette,newPal));
    mappalette = newPal;//Change the current palette to the one just selected

    if(validatePaletteRange()){
        owgis.layers.updateMainLayerParam('colorscalerange',minPalVal+ ',' + maxPalVal);
        //Update the KMLlink to visualize on google earth
        owgis.utils.replaceGetParamInLink("#kmlLink", "COLORSCALERANGE", minPalVal+ ',' + maxPalVal);
    }

	//Changes the palette
	owgis.layers.updateMainLayerParam('STYLES',lay_style+"/"+newPal);
	owgis.utils.replaceGetParamInLink("#kmlLink", "STYLES", lay_style+"/"+newPal);

	//If an animation is being displayed it reloads it with the new palette.
	if(owgis.ncwms.animation.status.current !== owgis.ncwms.animation.status.none){
		clearLoopHandler();
		owgis.ncwms.animation.dispAnimation();
	}
}

/**
 * Replaces the image of the palette used to the default and original one, this functions is essentially the same
 * as the above but it uses the maxPal and minPalVal of the origin defualt image. 
 */
function UpdatePaletteDefault(newPal, maxPal, minPal){

    //alert("mapaalette: " + mappalette);
    $('#imgPalette').attr("src", $('#imgPalette').attr("src").replace(mappalette,newPal));
    mappalette = newPal;//Change the current palette to the one just selected

    if(validatePaletteRange()){
//        owgis.layers.getMainLayer().setOptions({
//            styles: lay_style+"/"+newPal, 
//            colorscalerange: minPal+ ',' + maxPal
//        });
        owgis.layers.updateMainLayerParam('colorscalerange',minPalVal+ ',' + maxPalVal);
    	owgis.layers.updateMainLayerParam('STYLES',lay_style+"/"+newPal);

        //Update the KMLlink to visualize on google earth
        owgis.utils.replaceGetParamInLink("#kmlLink", "STYLES", lay_style+"/"+newPal);
        owgis.utils.replaceGetParamInLink("#kmlLink", "COLORSCALERANGE", minPal+ ',' + maxPal);
    }else{
//        owgis.layers.getMainLayer().setOptions({
//            styles: lay_style+"/"+newPal
//        });
    	owgis.layers.updateMainLayerParam('STYLES',lay_style+"/"+newPal);

        //Update the KMLlink to visualize on google earth
        owgis.utils.replaceGetParamInLink("#kmlLink", "STYLES", lay_style+"/"+newPal);
    }
}

/**
 *Gets the get the value of the default palette from the url (urlPaletteImg)
 */
function DefaultPalette()
{

    var lookup = /PALETTE=[A-z]*&/g; //use regular expresion to find the default palette

    minPalVal = initialMinPal;//reset globals back to defualt values
    maxPalVal = initialMaxPal;

    var match = urlPaletteImg.match(lookup);
    match = String(match);
    var equalSign = match.indexOf("=");
    var ampersand = match.indexOf("&");
    var defaultColor = match.substring(equalSign+1, ampersand);  

    // here we don't use UpdatePalette() becuase that one defualt to the max and min that is currently 
    //selected by the user
    UpdatePaletteDefault(defaultColor, initialMaxPal, initialMinPal);//update to original defualt palette
    $('#maxPal').val(initialMaxPal);//change the text of the input box of the html
    $('#minPal').val(initialMinPal);

}

/**
 * Displays or hides the div that contains all the palettes.
 * @paramforce_visib Forces an specific visibility of optional palettes.
 */
function displayOptionalPalettes(){
	 $('#palettes-div').toggle("fade"); 
}


/** Shows and hides the palettes windows (both at the same time) */
function showPalettes()
{       
    // Toggles the color range window
    $('#paletteWindowColorRange').toggle("fade");

    // We test the opacity of the 'color range window' to decide what
    // to do with the 'optional palettes window'
    if($('#paletteWindowColorRange').css("opacity") === "0") 
        $('#palettes-div').show();
    else
        $('#palettes-div').hide();

}

/**
 * changes the color of the layer depengind on the amount passed in
 * @paramamount - amount to change or update to 
 */
function increaseMaxColorRange(amount){
    $('#maxPal').val( eval(parseFloat($('#maxPal').val()).toPrecision(4)) + parseFloat(amount));
    UpdatePalette(mappalette);
}

/**
 * changes the color of the layer depengind on the amount passed in
 * @paramamount - amount to change or update to 
 */
function decreaseMinColorRange(amount){
    $('#minPal').val( eval(parseFloat($('#minPal').val()).toPrecision(4)) - parseFloat(amount));
    UpdatePalette(mappalette);
}
