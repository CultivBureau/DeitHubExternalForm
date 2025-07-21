document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phone');
    const form = document.getElementById('ditehubForm');
    let message = document.createElement('div');
    message.style.fontSize = '0.95em';
    message.style.marginTop = '0.25em';
    message.textContent = 'Number not found in the system.';
    message.style.color = 'red';
    // Remove the old message if it exists elsewhere
    if (message.parentNode) message.parentNode.removeChild(message);
    // Insert the message after the input-group div (parent of phone input)
    const phoneInputGroup = phoneInput.closest('.input-group');
    if (phoneInputGroup) {
        phoneInputGroup.insertAdjacentElement('afterend', message);
    } else {
        phoneInput.insertAdjacentElement('afterend', message);
    }
    // Show initial message on form load
    message.textContent = "";

    function normalizeInput(val) {
        let digits = val.trim().replace(/\D/g, '');
        if (digits.length === 10 && digits[0] !== '0') {
            digits = '0' + digits;
        }
        // Convert to international format for the API
        if (digits.length === 11 && digits.startsWith('0')) {
            return '+2' + digits;
        }
        return val;
    }

    async function getContactIdByPhone(phone) {
        const url = `https://diet-hub.bitrix24.com/rest/79257/1mcchkcck1kxs0sz/crm.duplicate.findbycomm.json?entity_type=CONTACT&type=PHONE&values[]=${encodeURIComponent(phone)}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            // The contact ID is in data.result.CONTACT[0]
            if (data.result && data.result.CONTACT && data.result.CONTACT.length > 0) {
                return data.result.CONTACT[0];
            }
        } catch (err) {
            console.error('Error fetching contact ID:', err);
        }
        return null;
    }

    async function getDealsByContactId(contactId) {
        const url = `https://diet-hub.bitrix24.com/rest/79257/1mcchkcck1kxs0sz/crm.deal.list.json?FILTER[CONTACT_ID]=${contactId}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.result || [];
        } catch (err) {
            console.error('Error fetching deals:', err);
        }
        return [];
    }

    const submitBtn = form.querySelector('button[type="submit"]');

    async function checkPhoneAndShowMessage(phone) {
        message.textContent = 'Searching...';
        message.style.color = 'gray';
        message.style.cssText = 'color: gray;';
        submitBtn.disabled = true;
        const contactId = await getContactIdByPhone(phone);
        if (!contactId) {
            message.textContent = 'Number not found in the system.';
            message.style.color = 'green';
            message.style.cssText = 'color: green !important;';
            submitBtn.disabled = false;
            return;
        }
        const deals = await getDealsByContactId(contactId);
        if (deals.length > 0) {
            message.textContent = `Number found in the system. Deals: ${deals.length}`;
            message.style.color = 'red';
            message.style.cssText = 'color: red !important;';
            submitBtn.disabled = true;
        } else {
            message.textContent = 'Number not found in the system.';
            message.style.color = 'green';
            message.style.cssText = 'color: green !important;';
            submitBtn.disabled = false;
        }
    }

    let lastTimeout = null;
    phoneInput.addEventListener('input', function() {
        let value = normalizeInput(phoneInput.value);
        if (lastTimeout) clearTimeout(lastTimeout);
        if (/^\+20\d{10}$/.test(value)) {
            lastTimeout = setTimeout(() => checkPhoneAndShowMessage(value), 500);
        } else {
            message.textContent = 'Number not found in the system.';
            message.style.color = 'green';
            message.style.cssText = 'color: green !important;';
            submitBtn.disabled = false;
        }
    });

    form.addEventListener('submit', async function(e) {
        let value = normalizeInput(phoneInput.value);
        if (!/^\+20\d{10}$/.test(value)) {
            message.textContent = 'Please enter exactly 10 digits for the phone number after +20 (will be checked as +20XXXXXXXXXX).';
            message.style.color = 'red';
            message.style.cssText = 'color: red !important;';
            phoneInput.focus();
            submitBtn.disabled = false;
            e.preventDefault();
            return false;
        }
        message.textContent = 'Searching...';
        message.style.color = 'gray';
        message.style.cssText = 'color: gray;';
        submitBtn.disabled = true;
        const contactId = await getContactIdByPhone(value);
        if (!contactId) {
            message.textContent = 'Number not found in the system.';
            message.style.color = 'green';
            message.style.cssText = 'color: green !important;';
            phoneInput.focus();
            submitBtn.disabled = false;
            e.preventDefault();
            return false;
        }
        const deals = await getDealsByContactId(contactId);
        if (deals.length > 0) {
            message.textContent = "You can't submit. The user already has booked a deal.";
            message.style.color = 'red';
            message.style.cssText = 'color: red !important;';
            submitBtn.disabled = true;
            phoneInput.focus();
            e.preventDefault();
            return false;
        } else {
            message.textContent = 'Number not found in the system.';
            message.style.color = 'green';
            message.style.cssText = 'color: green !important;';
            submitBtn.disabled = false;
        }
    });
});
