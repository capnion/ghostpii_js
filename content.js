runPlugin()
//decryptPage()


async function runPlugin(){ 
    chrome.storage.sync.get(['token'], async function(result) {
        console.log(result.token);
        my_token =  'Token  '+result.token;
        isDecrypted = await decryptPage(my_token);

        for (var j = 0; j < document.forms.length; j++) {
            if (document.forms[j].name == "encrypt_input"){
                var my_index = j;
                document.forms[j].addEventListener("submit", async function(event){
                    event.preventDefault();
                    document.getElementById('form_submit').disabled = true;
                    var boo = await encryptForm(event.target,my_token);
                    if(boo){
                        event.target.submit();
                    }
                });
            }
        }
    });
}

async function encryptForm(enc_form,my_token){
    //alert(enc_form.elements.length);
    var userData = await APILogin(my_token);
    var myID = parseInt(userData[0]['url'].match(/\d+/),10);
    //alert(myID);
    boundaries = []
    for(var ind = 0; ind < enc_form.elements.length; ind++){
        //alert('iteration');
        //alert(enc_form.elements[ind].type);
        if(enc_form.elements[ind].type == "text" || enc_form.elements[ind].type == "select-one"){
            if(enc_form.elements[ind].type == "select-one"){
                //alert(enc_form.elements[ind].name);
                if (enc_form.elements[ind].name == 'private' || enc_form.elements[ind].name.endsWith('poll_type')){
                    //alert("Skipping");
                    continue;
                }
                enc_form.elements[ind + 1].value = enc_form.elements[ind].value;
                var my_text = enc_form.elements[ind+1];
            }
            else{
                var my_text = enc_form.elements[ind];
            }
            while (my_text.value.length < 100){
                my_text.value += " ";
            }
            var key_info = await reserveKeys(my_text.value.length,my_token);

            var encoded_word = encodeWord(my_text.value);

            var data_boundary = [key_info[0]['minId'],key_info[0]['maxId']];
            boundaries.push(data_boundary[0]);
            boundaries.push(data_boundary[1]);

            //get the key
            var encryption_keys = await getEncryptKey(data_boundary, my_token);

            //use key to encrypt
            var encrypted_words = encryptWords(encryption_keys,[encoded_word]);

            //convert encrypted data to ciphertext
            var cipher_words = createCipherText(encrypted_words);

            my_text.value = cipher_words[0];
            //alert(my_text.value);
        }
    }
    console.log(boundaries);
    document.getElementById('id_lowerID').value = Math.min(...boundaries);
    document.getElementById('id_upperID').value = Math.max(...boundaries);
    document.getElementById('id_ownerID').value = myID;
    return true;
}

async function decryptPage(my_token){
    var my_token = my_token;
    
    var userData = await APILogin(my_token);
    var myID = parseInt(userData[0]['url'].match(/\d+/),10);
    
    var elements = document.getElementsByTagName("encrypted");
    var metadata = document.getElementsByTagName("encryptionMetadata");

    if (elements.length == 0 || metadata.length != 1){
        return false
    }

    var lower = metadata[0].dataset.lower;
    var upper = metadata[0].dataset.upper;

    var decrypt_index = lower;
    var key_index = 0;

    var decrypt_key = await getDecryptKey(lower,upper,my_token,myID);
    //console.log(decrypt_key)
    if (typeof(decrypt_key) == typeof("this is a string")){
        return false;
    }

    for(var ele_index = 0;ele_index < elements.length; ele_index++){
        decrypt_element = elements[ele_index];

        //console.log(decrypt_element.innerHTML.length)
        var encoded_word = translateCipherText(decrypt_element.innerHTML);
        var plaintext = '';

        for(var k = 0; k < encoded_word.length; k ++){
            // Loop through char by char and decrypt each cell

            //console.log(encoded_word.length);
            //console.log(decrypt_key.length);
            //console.log(decrypt_key[key_index]);
            
            decrypt_obj = JSON.parse(JSON.stringify(decrypt_key[key_index]));
            //console.log(decrypt_obj.id);
            //console.log(decrypt_index)

            if(decrypt_index == decrypt_obj.id){
                //alert('decrypting in progress')
                var ascii_code = encoded_word[k] - decrypt_obj.atom_key;
                plaintext = plaintext + String.fromCharCode(ascii_code);
                key_index ++;
            }
            decrypt_index ++;
        }
        if (plaintext != ''){
            decrypt_element.innerHTML = plaintext;
        }
    }
    return true;

}


//DEPRECATED
async function testFunc(my_token){
    //var my_token = 'Token  b78c05d34be136e72efc75d492decd08d57cc617';
    var my_token = my_token;
    
    var userData = await APILogin(my_token);
    var myID = parseInt(userData[0]['url'].match(/\d+/),10);
    
    
    var elements = document.getElementsByTagName("encrypted");
    if(elements[0].dataset.type == 'string'){
        for(var ele_index = 0;ele_index < elements.length;ele_index++){
            var upper = String(parseInt(elements[ele_index].dataset.upper)+1);
            var lower = elements[ele_index].dataset.lower;

            var decrypt_key = await getDecryptKey(lower,upper,my_token,myID);
            
            if (typeof(decrypt_key) == typeof("this is a string")){
                continue;
            }
            
            
            decrypt_element = elements[ele_index];

            var encoded_word = translateCipherText(decrypt_element.innerHTML);
            var plaintext = '';


            for(var k = 0; k < encoded_word.length; k ++){
            // Loop through char by char and decrypt each cell
                decrypt_obj = JSON.parse(JSON.stringify(decrypt_key[k]));

                var ascii_code = encoded_word[k] - decrypt_obj.atom_key;
                plaintext = plaintext + String.fromCharCode(ascii_code);
            }

            decrypt_element.innerHTML = plaintext;
        }
    }
    else if (elements[0].dataset.type == 'frame') {
    var upper = String(parseInt(elements[0].dataset.upper)+1);
    var lower = elements[0].dataset.lower;

    var decrypt_key = await getDecryptKey(lower,upper,my_token,myID);
    
    decrypt_table = elements[0].getElementsByTagName("tr");

    offsets = [0];
    var temp_row = decrypt_table[1].getElementsByTagName("td");
    for(var i = 1; i < temp_row.length; i++){
        offsets.push(offsets[i-1]+(decrypt_table.length-1)*(translateCipherText(temp_row[i-1].innerHTML).length));
    }
    
    
    for(var i = 1; i< decrypt_table.length; i++){
        decrypt_row = decrypt_table[i].getElementsByTagName("td");
        for(var j=0; j < decrypt_row.length;j++){
            decrypt_element = decrypt_row[j];
            var encoded_word = translateCipherText(decrypt_element.innerHTML);
            var plaintext = '';


            for(var k = 0; k < encoded_word.length; k ++){
            // Loop through char by char and decrypt each cell
                
                var ascii_code = encoded_word[k] - decrypt_key[offsets[j]+encoded_word.length*(i-1)+k]['atom_key'];
                plaintext = plaintext + String.fromCharCode(ascii_code);
            }

            decrypt_element.innerHTML = plaintext;
        }
    }
    }

}

//decrypts data we pull out of the database for display
//DEPRECATED
/** 
async function decryptPage(){

    var my_token = 'Token  f65ec580ccb3e8717c4e33b99c1c94269f2f6675';
    var userData = await APILogin(my_token);
    var myID = parseInt(userData[0]['url'].match(/\d+/),10);

    table = document.getElementsByTagName("enc");


    // Go row by row through all encrypted lines
    for(var i = 0; i < table.length; i++){
        var row = table[i];

        // Remember the endpoints for each row and call the API for decryption key
        var lower = row.getElementsByClassName('lower')[0].innerHTML
        var upper = row.getElementsByClassName('upper')[0].innerHTML
        var decrypt_key = await getDecryptKey(lower,upper,my_token,myID);

        // keep track of where we are in the keydata
        var key_num = 0;

        for( var j = 0; j < row.cells.length - 4; j ++){

            // Get the data ready for decryption
            var encoded_word = translateCipherText(row.cells[j].innerHTML);
            var plaintext = '';

            for(var k = 0; k < encoded_word.length; k ++){
                // Loop through char by char and decrypt each cell
                var ascii_code = encoded_word[k] - decrypt_key[key_num]['atom_key'];
                plaintext = plaintext + String.fromCharCode(ascii_code);
                key_num ++;
            }
            row.cells[j].innerHTML = plaintext;
        }
    }

}
*/

function APILogin(my_token){

    var url = 'https://ghostpii.com/api/api-auth/login/';

    return $.ajax({
        type: 'GET',
        url: url,
        dataType: 'html',
        xhrFields: {
            withCredentials: true
        },
        beforeSend: function(xhr){xhr.setRequestHeader("Authorization", my_token);},
    }).then(function (response){
        parser = new DOMParser();
        resDoc = parser.parseFromString(response,'text/html');
        return passCredentials(resDoc.getElementsByName('csrfmiddlewaretoken')[0].value,my_token);
    }); 
}

// Strictly a helper for APILogin
// Completes the login function by giving the API all the credentials that go
// along with our AuthToken so the server can identify us when we start encrypting
function passCredentials(middlewaretoken,my_token){
    url = 'https://ghostpii.com/api/api-auth/login/';
    var login_data = {'username':'jackphillips2', 'password':'uniquepassword', 'next':'/', 'csrfmiddlewaretoken' : middlewaretoken};

    return $.ajax({
        type: 'POST',
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        data: login_data,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return getUserData(my_token);}); 
}

// After we have logged in we can hit the users endpoint and return the json
// Not actually a necessary step yet, but may be needed to get UserID
// and other info for determining what we can and can't decrypt
function getUserData(my_token){
    url = "https://ghostpii.com/api/users/";

    return $.ajax({
        type: 'GET',
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return response;}); 
}

// Hits /blob/ endpoint to get a info for decryption key
function getDecryptKey(lower, upper, my_token, myID){
    var url = "https://ghostpii.com/api/perm-check/";
    var indicesList = []
    for(var i = lower; i < upper; i++ ){
        indicesList.push(parseInt(i));
    }
    userhash = Date.now();

    return $.ajax({
        type: 'POST',
        data: {'assigned_user' : myID, 'keyJSON':JSON.stringify(indicesList), 'userhash':userhash,},
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return sendDecryptBlob(response,my_token,userhash);}); 
}

function getDecryptBlob(response,my_token,myID,userhash){
    url = 'https://ghostpii.com/api/blob/'
    
    return $.ajax({
        type: 'GET',
        data: {'assigned_user' : myID, 'userhash':userhash},
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return sendDecryptBlob(response,my_token);}); 

}

function sendDecryptBlob(response,my_token,userhash){
    var keyData = userhash;
    url = 'https://ghostpii.com/api/decrypt/?blobData=' + keyData;

    return $.ajax({
        type: 'GET',
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return response;}); 
}

//takes a single word of ciphertext and returns the encrypted value
function translateCipherText(word){
    word = unEntity(word);
    var encoded_word = []
    for(var i = 0; i < word.length; i = i + 3){
        var trigram = word.substring(i,i+3);
        //console.log(trigram)
        var encoded_char = 0;
        for(var j = 0; j < trigram.length; j++){
            var char_index = trueIndex(trigram.charAt(j));
            encoded_char = encoded_char + (char_index * (87**j));
        }
        //console.log(encoded_char);
        encoded_word.push(encoded_char);
    }
    return encoded_word;
}

//helper to fix html rendering & as &amp; etc.
function unEntity(str){
    return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

//helper function that adjusts ascii to index in array of ciphertext chars
function trueIndex(char){
    admChars = ['!', '"', '#', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', ']', '^', '_', '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

    for(var i = 0; i < admChars.length; i ++){
        if(admChars[i] == char){
            return i;
        }
    }
}


// This function hits the /state/ endpoint to reserve keys
// Need to change hardcoded URL
function reserveKeys(key_length, my_token){
    url = "https://ghostpii.com/api/state/?length=" + key_length;
    //alert(url);

    return $.ajax({
        type: 'GET',
        data: {'permLevel' : 'vote-app'},
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return response;}); 
}

//gets encryption keys for a specified range at /staticencrypt/ endpoint
function getEncryptKey(data_boundary, my_token){
    url = "https://ghostpii.com/api/staticencrypt/?lower=" + data_boundary[0] + "&upper="+ data_boundary[1];
    //alert(url);

    return $.ajax({
        type: 'GET',
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", my_token);
        },
        url: url,
        xhrFields: {
            withCredentials: true
        },
    }).then(function (response){return response;});    
}

//takes a row (the full form) of encoded words and a list of keys and encrypts
function encryptWords(keys,words){
    encrypted_words = []
    key_index = 0;
    for(var i = 0; i < words.length; i ++){
        encrypted_word = [];
        for(var j = 0; j < words[i].length; j++){
            var encrypted_letter = keys[key_index]['atom_key'] + words[i][j];
            encrypted_word.push(encrypted_letter);
            key_index ++;
        }
        encrypted_words.push(encrypted_word);
    }
    return encrypted_words;
}

//takes a row of encrypted values and converts it to ciphertext
function createCipherText(words){
    admChars = ['!', '"', '#', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', ']', '^', '_', '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

    cipher_words = []
    for(var i = 0; i < words.length; i ++){
        cipher_word = '';
        for(var j = 0; j < words[i].length; j++){
            trigram = '';
            interim = words[i][j];
            for(var k = 0; k < 3; k ++){
                var residue = interim % 87;
                interim = Math.floor((interim - residue)/87);
                trigram = trigram + admChars[residue];
            }
            cipher_word = cipher_word + trigram;
        }
        cipher_words.push(cipher_word);
    }
    return cipher_words;
}

// Takes the plaintext strings and returns their ascii encodings
function encodeWord(word_to_encode){
    var encoding = [];

    for(var i = 0; i < word_to_encode.length; i ++){
        encoding.push(word_to_encode.charCodeAt(i));
    }
    
    return encoding;
}