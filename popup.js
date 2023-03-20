document.addEventListener('DOMContentLoaded', documentEvents  , false);

function myAction(input) {

  if (input.value.startsWith("Token  ")){
    input.value = input.value.substr(7);
  }
  if (input.value.startsWith("Token ")){
    input.value = input.value.substr(6);
  }

    chrome.storage.sync.set({"token": input.value}, function() {
        console.log('Value is set to ' + input.value);
        setTokenOutput(input.value);
      });
    // do processing with data
    // you need to right click the extension icon and choose "inspect popup"
    // to view the messages appearing on the console.
}

function documentEvents() {    
  document.getElementById('ok_btn').addEventListener('click', 
    function() { myAction(document.getElementById('name_textbox'));
  });
}

function getToken (doc){
    var token_output = doc.getElementById('token').innerHTML;
    chrome.storage.sync.get(['token'], function(result) {
        setTokenOutput(result.token);
    });
}

function setTokenOutput(stringSet){
    document.getElementById('token').innerHTML = stringSet;
}

window.onload = function (){getToken(document)}