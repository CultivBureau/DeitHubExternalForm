document.getElementById('ditehubForm').onsubmit = function (e) {
    var phone = document.getElementById('phone').value;
    if (!/^\d{10}$/.test(phone)) {
        alert('Please enter exactly 10 digits for the phone number after +20.');
        document.getElementById('phone').focus();
        e.preventDefault();
        return false;
    }
};