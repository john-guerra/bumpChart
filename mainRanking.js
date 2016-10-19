/*jslint browser: true, indent: 4 */
/* global d3: false, $: false, alert: false, bumpChartPhotos: false , FlickrUtils: true, console: true, utils: true */

//Main
(function () {
    "use strict";

    var dateFmt = d3.time.format("%Y-%m-%d");

    var myBumpChart,
    MIN_HEIGHT = 600,
    daysCount = 5,
    url = FlickrUtils.getUrl(),
    sortBy = "views",
    typeChart = "bumpchart",
    dateFrom,
    dateTo,
    user="me",
    numPhotos = 10,
    allPhotos,
    alreadyFailed = false,
    reloadInterval;


    dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysCount);
    dateTo = new Date ();

    d3.select("#inputDateFrom").property("value", dateFmt(dateFrom));
    d3.select("#inputDateTo").property("value", dateFmt(dateTo));


    // if(utils.getParameterByName("sortBy") !== undefined && utils.getParameterByName("sortBy") !== "") {
    //     sortBy = utils.getParameterByName("sortBy");
    //     d3.select("#sizeSelect").property("value",sortBy);
    // }

    if(utils.getParameterByName("dateFrom") !== undefined && utils.getParameterByName("dateFrom") !== "") {
        dateFrom = dateFmt.parse(utils.getParameterByName("dateFrom"));
        d3.select("#inputDateFrom").property("value", dateFmt(dateFrom));
    }

    if(utils.getParameterByName("dateTo") !== undefined && utils.getParameterByName("dateTo") !== "") {
        dateTo = dateFmt.parse(utils.getParameterByName("dateTo"));
        d3.select("#inputDateTo").property("value", dateFmt(dateTo));
    }

    if(utils.getParameterByName("typeChart") !== undefined && utils.getParameterByName("typeChart") !== "") {
        typeChart = utils.getParameterByName("typeChart");
        d3.select("#typeSelect").property("value", typeChart);
    }

    if(utils.getParameterByName("numPhotos") !== undefined && utils.getParameterByName("numPhotos") !== "") {
        numPhotos = +utils.getParameterByName("numPhotos");
        if (numPhotos!==-1 && numPhotos!=="-1") {
            d3.select("#numPhotosRange").property("value", numPhotos);
            d3.select("#numPhotosSliderLabel").html("Number of photos " + d3.select("#numPhotosRange").property("value"));
        }
    }


    // d3.select("#sizeSelect").on("change", reloadData);
    d3.select("#inputDateFrom").on("change", reloadData);
    d3.select("#inputDateTo").on("change", reloadData);
    d3.select("#addDayButton").on("click", onAddDay);
    // d3.select("#typeSelect").on("change", reloadData);
    d3.select("#typeSelect").on("change", updateAll);
    d3.select("#reloadButton").on("click", reloadData);
    d3.select("#numPhotosRange").on("change", updateAll).on("input", function () {
        d3.select("#numPhotosSliderLabel").html("Number of photos " + d3.select("#numPhotosRange").property("value"));
    });



    function getParams() {
        console.log("getParams");
        // sortBy = d3.select("#sizeSelect").property("value");
        typeChart = d3.select("#typeSelect").property("value");
        dateFrom = dateFmt.parse(d3.select("#inputDateFrom").property("value"));
        dateTo = dateFmt.parse(d3.select("#inputDateTo").property("value"));
        numPhotos = +d3.select("#numPhotosRange").property("value");


        daysCount = (dateTo - dateFrom) / (1000 * 60 * 60 * 24) + 1;

        //Update the url
        utils.setGetParameter("numPhotos", numPhotos);
        utils.setGetParameter("sortBy", sortBy);
        utils.setGetParameter("typeChart", typeChart);
        utils.setGetParameter("dateFrom", dateFmt(dateFrom));
        utils.setGetParameter("dateTo", dateFmt(dateTo));


    }

    function updateAll() {
        console.log("Update");
        getParams();

        d3.select("#daysCount").text(daysCount);

        var height = Math.round($(window).height() - document.getElementById("mainContainer").offsetTop );
        height = Math.max(MIN_HEIGHT, height);
        d3.select("#mainContainer").style("height", height + "px");

        var width = document.getElementById("mainContainer").offsetWidth;


        if (typeChart === "bumpchart") {
            d3.select("#numPhotos").style("display", "inline");
        } else {
            d3.select("#numPhotos").style("display", "none");
        }

        if (typeChart==="bumpchart" && numPhotos > 10) {
            height = Math.max(height, numPhotos * 30);
        }
        if (daysCount > 5) {
            // width = Math.max(width, 200 * daysCount);

        }

        myBumpChart
            .y(function (d) {
                return typeChart === "bumpchart" ? d.order: d[sortBy]; })
            .topN(numPhotos)
            .reverseYScale(typeChart === "bumpchart" )
            .height(height)
            .width(width);

        d3.select("#mainContainer")
            .datum(allPhotos)
            // .style("height", timelineHeight + "px")
            .call(myBumpChart);
    }


    var callbackReferrers = function (err, data, date) {
        if (alreadyFailed) return;
        var source, subsource;

        if (err || data.stat=== "fail" ) {
            console.log("User doesn't have stats");
            // alert("User doesn't have stats");
            console.error(err);
            // clearInterval(reloadInterval);
            // alreadyFailed = true;
            return;
        }

        var addSource = function (source, subsource) {
            return function (d, i) {
                var obj = {
                    id : subsource,
                    label : subsource,
                    views : d.viewcount,
                    source: source,
                    category: subsource,
                    date: date
                };
                if (d.hasOwnProperty("displaytext")) {
                    obj.id = subsource + i;
                    obj.label =  source + " " + subsource + " " + d.displaytext;
                    obj.displaytext = d.displaytext;
                    obj.url = d.link;
                }
                allPhotos.push(obj);
            };
        };


        for (source in data) {
            if (!data.hasOwnProperty(source)) continue;

            for (subsource in data[source]) {
                if (!data[source].hasOwnProperty(subsource)) continue;
                if(subsource === "viewcount" || source === "stat" || source === "Flickr") continue;

                if (subsource === "items") {
                    data[source].items.forEach(addSource(source, subsource));
                // } else if (data[source][subsource].hasOwnProperty("items")) {
                    // data[source][subsource].items.forEach(addSource(source, subsource));
                } else {
                    addSource(source,subsource)(data[source][subsource], 0);
                }
            }
        }

        // allPhotos = allPhotos.concat(photosArray);
        updateAll();

        window.onresize = onResize;
    }; //callbackReferrers


    var callback = function (err, data, date) {
        if (alreadyFailed) return;
        var photosArray = FlickrUtils.getPhotos(data);
        if (err || data.stat=== "fail" || photosArray === undefined ) {
            console.log("User doesn't have stats");
            // alert("User doesn't have stats");
            console.error(err);
            // clearInterval(reloadInterval);
            // alreadyFailed = true;
            return;
        }

        photosArray.forEach(function (d, i) {
            d.date = date;
            d.daysSinceTaken = Math.floor((date - d3.time.format("%Y-%m-%d %H:%M:%S").parse(d.datetaken) ) / (1000 * 60 * 60 * 24)) ;
            // d.daysSinceTaken = d.daysSinceTaken < 0 ? undefined : d.daysSinceTaken;
            d.daysSinceUploaded = Math.floor((date - new Date(d.dateupload * 1000) ) / (1000 * 60 * 60 * 24));
            // d.daysSinceUploaded = d.daysSinceUploaded < 0 ? undefined : d.daysSinceUploaded;
            d.order = i+1;
            d.img = FlickrUtils.getImgForPhoto(d.id, d.server, d.farm, d.secret);
            d.url = FlickrUtils.getUrlForPhoto(d.id, "me");
        });


        allPhotos = allPhotos.concat(photosArray);
        updateAll();

        window.onresize = onResize;
    }; //callback


    var requestOneDay = function (date, s) {
        console.log("Requesting " + dateFmt(date));
        if (typeChart === "sources") {

            d3.json(
                FlickrUtils.getGenericUrl({
                    "method":"flickr.stats.getReferrerCategoriesForDate",
                    "date":dateFmt(date),
                    // "page":i+1,
                    "extras":"count_views%2Ccount_faves%2Ccount_comments%2Cpath_alias%2Cdate_upload%2Cdate_taken"
                }),
                function (error, data) {
                    console.log("Callback " + dateFmt(date));
                    callbackReferrers(error, data, date);
                }
            );
        } else {

            d3.json(
                FlickrUtils.getGenericUrl({
                    "method":"flickr.stats.getPopularPhotos",
                    "sort":sortBy,
                    "date":dateFmt(date),
                    // "page":i+1,
                    "per_page":"100",
                    "extras":"count_views%2Ccount_faves%2Ccount_comments%2Cpath_alias%2Cdate_upload%2Cdate_taken"
                }),
                function (error, data) {
                    console.log("Callback " + dateFmt(date));
                    callback(error, data, date);
                }
            );

        }

    };

    function reloadData() {
        var stopReloading = false;
        alreadyFailed = false;
        initBumpChart();
        getParams();

        allPhotos = [];

        var date =dateFrom;
        reloadInterval = setInterval( function () {
            if (alreadyFailed || stopReloading) {
                clearInterval(reloadInterval);
                return;
            }
            requestOneDay(dateFmt.parse(dateFmt(date)), sortBy);


            date = new Date(date);
            date.setDate(date.getDate() + 1);

            if (date > dateTo) {
                alreadyFailed = true;
                stopReloading = true;
                clearInterval(reloadInterval);
            }
        }, 1000);

    }


    function onResize(event) {
        console.log("on Resize");
        updateAll();
    }


    function initBumpChart() {


    }


    reloadData();

}()); //main
