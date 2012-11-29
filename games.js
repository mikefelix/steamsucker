var result;

function clearBox(e){
    e.value = '';
    $(e).removeClass('greyed');
}

function loadGames() {
    var user = $('#username').val();
    if (!user){
        alert('Please provide a username!');
        return;
    }

    $('#loading').html('<image src="loading_bar.gif"/>');
    $('#gamesTab').html('');

    $.getJSON('games/' + user, function (data) {
        result = data;
        $('#loading').html('');
        arrange();
    });
}

function arrange(){
    if (result.error || !result.games){
        alert('Could not get data. Try again. ' + JSON.stringify(result));
        return;
    }

//    alert(result.games.length);
    var table = $('#gamesTab');
    for (var i = 0; i < result.games.length; i++){
        var game = result.games[i];
        table.append('<tr><td>' + game.hoursOnRecord + '</td><td>' + game.name + '</td></tr>');
    }
}

$.urlParam = function(name){
    var results = new RegExp('[\\?&amp;]' + name + '=([^&amp;#]*)').exec(window.location.href);
    return results[1] || 0;
};

$(function(){
    if ($.urlParam('username')){
        $('#username').val($.urlParam('username'));
        loadGames();
    }
});