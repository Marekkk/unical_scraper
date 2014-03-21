var webpage = require('webpage');
var fs = require('fs');

function makecsv(rubrica) {
    var content = "";
    var line;
    for (var struttura in rubrica){
		var sub = rubrica[struttura];
		for (var record in sub){
			r = sub[record];
			var line = [struttura, r.name,r.phone,r.email,r.sett,r.occ];

			for (var f in line) {
				if (line[f] !== undefined)
				line[f] = line[f].replace(/,/g,' ');
			}

			content += line.join(',');
			content += '\n';
		}
    }
    return content;
}

function scrapRubrica(){
    debugger;
    selector = "body table:first table:first table:eq(1) table:eq(1) table:eq(0) tr:eq(1) table:first > tbody > tr:even > td > table"
    var rubrica = [];
    if (jQuery === undefined){
	console.log('error scraping...');
	console.log(document.body.innerHTML);
    }
    var numbers = jQuery(selector);

    numbers.each(function() {
	var record = {};
	var email = jQuery(this).find('span a[href*="mailto"]:first').html();

	if (email !== undefined && email !== null)
	    record.email = email;

	var spans = jQuery(this).find('td:eq(0) span').not(':has(a[href*=mailto])');

	record.name = jQuery(spans[0]).text().trim();
	if (spans.length > 1){
	    record.sett = jQuery(spans[1]).text().trim();
	    if (spans.length > 2) {
		record.occ = jQuery(spans[2]).text().trim();
	    }
	}

	if (spans.length > 3){
	    record.additional = [];
	    spans.filter(":gt(2)").each((function(r){
		return function() {
		    r.additional.push(jQuery(this).text().trim());
		    return;
		};
	    }(record)));
	}

	record.phone = jQuery(this).find('td:eq(1) b:first').text().trim();
	rubrica.push(record);
    });

    return rubrica;
}

function debug(m){
	console.log("debug:  " + m);
}

//opena main page and scrap rubrica links
var mainpage = webpage.create();
mainpage.open('http://www.unical.it/portale/portaltemplates/view/search_phone.cfm', function (status) {

    var mainurl='http://www.unical.it/portale/portaltemplates/view/search_phone.cfm';
    console.log('Mainpage loaded');

    if (status !== 'success') {
		console.log('Non riesco a caricare la pagina iniziale della rubrica!');
		phantom.exit();
		return;
    }

    //mainpage has to be jquerify
    mainpage.injectJs('jquery-1.11.0.min.js');
    var options = mainpage.evaluate (function (){
    	var ret = [];
    	$('select option:gt(0)').each(function() {
    	    ret.push($(this).prop('value'));
    	    return;
    	});
    	return ret;
    });

    var rubrica = {};
    var completed = 0;
    for (var i = 0; i < options.length ; i++) {

	console.log(options[i]+' '+i);
	var aPage = webpage.create();
	aPage.onConsoleMessage = (function(index,aPage){
	    return function(m) {
		console.log('page '+index+'>'+m);
	    };
	})(i,aPage);

	aPage.open(mainurl, (function(i,aPage) {
	    return function(status){

		if (status !== 'success') {
		    console.log('Non riesco a caricare la pagina iniziale della rubrica!');
		    return;
		}

		aPage.injectJs('jquery-1.11.0.min.js');

		aPage.onLoadFinished = function() {
		    aPage.injectJs('jquery-1.11.0.min.js');
		    rubrica[options[i]] = aPage.evaluate(scrapRubrica);
		    completed++;
		    console.log(completed);
		    if (completed >= options.length){

			console.log('saving JSON to rubrica.json');
			var f = fs.open('rubrica.json','w');
			f.write(JSON.stringify(rubrica));
			f.close();
			console.log('saving CSV to rubrica.csv');
			var f = fs.open('rubrica.csv','w');
			f.write(makecsv(rubrica));
			f.close();
			phantom.exit();
		    }

		};

		var status = aPage.evaluate (function submit(index){
		    if (!jQuery){
			console.log('Cannot find jquery');
			return false;
		    }
		    console.log('submitting form');
		    jQuery('select option:eq('+index+')').prop('selected',true);
		    JS_CercaStruttura();
		    return true;
		},i+1);

		if(!status){
		    aPage.render('errore_'+i+'.png');
		}

	    }
	})(i,aPage));
    }

});

