document.addEventListener('DOMContentLoaded', function () {
  const token = "1mcchkcck1kxs0sz";
  const domain = "https://diet-hub.bitrix24.com/rest/79257/" + token;

  const form = document.getElementById("ditehubForm");
  const phoneInput = document.getElementById("phone");
  const phone2Input = document.getElementById("phone2");
  const submitBtn = form.querySelector("button[type='submit']");

  let contactId = null;
  let dealId = null;
  let archivedDeals = [];

  const iti = window.intlTelInput(phoneInput, {
    initialCountry: "eg",
    preferredCountries: ["eg"],
    separateDialCode: false,
    nationalMode: false,
    formatOnDisplay: false,
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
  });

  const iti2 = window.intlTelInput(phone2Input, {
    initialCountry: "eg",
    preferredCountries: ["eg"],
    separateDialCode: false,
    nationalMode: false,
    formatOnDisplay: false,
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
  });

  // ✅ Message under phone input
  const message = document.createElement('div');
  message.style.fontSize = '0.95em';
  message.style.marginTop = '0.25em';
  phoneInput.closest('.input-group')?.insertAdjacentElement('afterend', message);

  // ✅ Message under phone2 input
  const message2 = document.createElement('div');
  message2.style.fontSize = '0.95em';
  message2.style.marginTop = '0.25em';
  phone2Input.closest('.input-group')?.insertAdjacentElement('afterend', message2);

  // ✅ Phone normalization
  function formatPhone(number) {
    // Remove all non-digits first
    let formatted = number.replace(/\D/g, '');
    
    // If it starts with 20, remove it
    if (formatted.startsWith('20')) {
      formatted = formatted.substring(2);
    }
    
    // If it starts with 0, remove it
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    
    // Check if it's exactly 10 digits and starts with 1
    if (formatted.length === 10 && formatted.startsWith('1')) {
      return '+20' + formatted;
    }
    
    return 'invalid';
  }

  // ✅ Debounce
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ✅ Reset all variables to clean state
  function resetState() {
    contactId = null;
    dealId = null;
    archivedDeals = [];
  }

  // ✅ Realtime Contact & Deal Check for Phone2
  const checkPhone2 = debounce(async () => {
    const rawPhone = phone2Input.value;
    
    // Clear message if input is empty
    if (!rawPhone.trim()) {
      message2.textContent = "";
      return;
    }

    const formattedPhone = formatPhone(rawPhone);
    
    if (formattedPhone === 'invalid') {
      message2.textContent = "Invalid number format";
      message2.style.color = "red";
      return;
    }

    message2.textContent = "🔍 Searching...";
    message2.style.color = "gray";

    try {
      // ✅ Check contact
      const contactRes = await fetch(`${domain}/crm.duplicate.findbycomm.json?type=PHONE&values[]=${encodeURIComponent(formattedPhone)}`);
      const contactData = await contactRes.json();
      
      // Handle API errors
      if (contactData.error) {
        throw new Error(contactData.error_description || 'API Error');
      }
      
      const contactId2 = contactData.result?.CONTACT?.[0] || null;

      if (!contactId2) {
        // No contact found
        message2.textContent = "✅ No existing contact for this number.";
        message2.style.color = "green";
        return;
      }

      // ✅ Check deals for that contact
      const dealRes = await fetch(`${domain}/crm.deal.list.json?FILTER[CONTACT_ID]=${contactId2}`);
      const dealData = await dealRes.json();
      
      // Handle API errors
      if (dealData.error) {
        throw new Error(dealData.error_description || 'API Error');
      }
      const invalidStages = ["UC_PZZDZ7", "LOSE", "EXECUTING"];
      const deals = dealData.result || [];

      const archivedDeals2 = deals.filter(d => invalidStages.includes(d.STAGE_ID));

      // ✅ Check if there is any active deal (not in invalidStages)
      const validDeal = deals.find(d => !invalidStages.includes(d.STAGE_ID));

      if (contactId2 && validDeal) {
        message2.textContent = `⚠️ Contact exists (ID: ${contactId2}) with active deal (ID: ${validDeal.ID}).`;
        message2.style.color = "red";
      } else if (contactId2 && archivedDeals2.length > 0) {
        message2.textContent = `🔄 Contact exists (ID: ${contactId2}). ${archivedDeals2.length} archived deal(s).`;
        message2.style.color = "blue";
      } else if (contactId2) {
        message2.textContent = `✅ Contact exists (ID: ${contactId2}). No active deal.`;
        message2.style.color = "orange";
      }
    } catch (err) {
      console.error("Check error for phone2:", err);
      message2.textContent = "❌ Error checking system. Please try again.";
      message2.style.color = "red";
    }
  }, 500);

  // ✅ Realtime Contact & Deal Check
  const checkPhone = debounce(async () => {
    const rawPhone = phoneInput.value;
    
    // Clear message if input is empty
    if (!rawPhone.trim()) {
      message.textContent = "";
      submitBtn.disabled = false;
      resetState();
      return;
    }

    const formattedPhone = formatPhone(rawPhone);
    
    if (formattedPhone === 'invalid') {
      resetState();
      message.textContent = "Invalid number format";
      message.style.color = "red";
      submitBtn.disabled = true;
      return;
    }

    message.textContent = "🔍 Searching...";
    message.style.color = "gray";
    submitBtn.disabled = true;

    try {
      // ✅ Check contact
      const contactRes = await fetch(`${domain}/crm.duplicate.findbycomm.json?type=PHONE&values[]=${encodeURIComponent(formattedPhone)}`);
      const contactData = await contactRes.json();
      
      // Handle API errors
      if (contactData.error) {
        throw new Error(contactData.error_description || 'API Error');
      }
      
      contactId = contactData.result?.CONTACT?.[0] || null;

      if (!contactId) {
        // No contact found
        resetState();
        message.textContent = "✅ No existing contact — new one will be created.";
        message.style.color = "green";
        submitBtn.disabled = false;
        return;
      }

      // ✅ Check deals for that contact
      const dealRes = await fetch(`${domain}/crm.deal.list.json?FILTER[CONTACT_ID]=${contactId}`);
      const dealData = await dealRes.json();
      
      // Handle API errors
      if (dealData.error) {
        throw new Error(dealData.error_description || 'API Error');
      }
      const invalidStages = ["UC_PZZDZ7", "LOSE", "EXECUTING"];
      const deals = dealData.result || [];

      archivedDeals = deals.filter(d => invalidStages.includes(d.STAGE_ID));

      // ✅ Check if there is any active deal (not in invalidStages)
      const validDeal = deals.find(d => !invalidStages.includes(d.STAGE_ID));
      dealId = validDeal?.ID || null;

      if (contactId && dealId) {
        message.textContent = `⚠️ Contact exists (ID: ${contactId}) with active deal (ID: ${dealId}). Cannot submit.`;
        message.style.color = "red";
        submitBtn.disabled = true;
      } else if (contactId && archivedDeals.length > 0) {
        message.textContent = `🔄 Contact exists (ID: ${contactId}). ${archivedDeals.length} archived deal(s) will be reactivated.`;
        message.style.color = "blue";
        submitBtn.disabled = false;
      } else if (contactId) {
        message.textContent = `✅ Contact exists (ID: ${contactId}). No active deal — ready to submit.`;
        message.style.color = "orange";
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error("Check error:", err);
      message.textContent = "❌ Error checking system. Please try again.";
      message.style.color = "red";
      submitBtn.disabled = false;
      resetState();
    }
  }, 500);

  phoneInput.addEventListener("input", checkPhone);
  
  phoneInput.addEventListener('blur', function() {
    if (phoneInput.value.trim()) {
      const formattedNumber = formatPhone(phoneInput.value);
      if (formattedNumber === 'invalid') {
        message.textContent = "Invalid number format";
        message.style.color = "red";
        submitBtn.disabled = true;
        resetState();
      }
    } else {
      // Clear error message when input is empty
      message.textContent = "";
      submitBtn.disabled = false;
      resetState();
    }
  });

  // Event listeners for phone2
  phone2Input.addEventListener("input", checkPhone2);
  
  phone2Input.addEventListener('blur', function() {
    if (phone2Input.value.trim()) {
      const formattedNumber = formatPhone(phone2Input.value);
      if (formattedNumber === 'invalid') {
        message2.textContent = "Invalid number format";
        message2.style.color = "red";
      }
    } else {
      // Clear error message when input is empty
      message2.textContent = "";
    }
  });

  // ✅ Form Submit Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawPhone = phoneInput.value.trim();
    const rawPhone2 = phone2Input.value.trim();
    const formattedPhone = formatPhone(rawPhone);
    const formattedPhone2 = rawPhone2 ? formatPhone(rawPhone2) : null;

    // Validate phone format
    if (formattedPhone === 'invalid') {
      alert("Please enter a valid Egyptian phone number.");
      return;
    }

    // Validate phone2 format if provided
    if (rawPhone2 && formattedPhone2 === 'invalid') {
      alert("Please enter a valid Egyptian phone number for Phone 2.");
      return;
    }

    const firstName = document.querySelector("#first-name").value.trim();
    const lastName = document.querySelector("#last-name").value.trim();
    const source = document.querySelector("#source").value;
    const comment = document.querySelector("#comment").value;
    const bookingDate = document.querySelector("#booking-date").value;
    const bookingTime = document.querySelector("#booking-time").value;
    const dealType = document.querySelector("input[name='deal-type']:checked")?.value;
    const responsibleId = document.querySelector("#responsibleId").value;
    const datetime = `${bookingDate} ${bookingTime}`;

    if (!firstName || !bookingDate || !bookingTime || !source || !dealType || !responsibleId) {
      alert("All fields are required.");
      return;
    }

    // ✅ Prevent creating new if active deal exists
    if (dealId) {
      showToast("⚠️ Active deal already exists. Cannot create new deal.", false);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...`;

    try {
      let createdMessage = "";

      // ✅ Create Contact if needed
      if (!contactId) {
        const phoneArray = [{ VALUE: formattedPhone, VALUE_TYPE: "WORK" }];
        if (formattedPhone2) {
          phoneArray.push({ VALUE: formattedPhone2, VALUE_TYPE: "WORK" });
        }

        const contactRes = await axios.post(`${domain}/crm.contact.add.json`, {
          fields: {
            NAME: firstName,
            LAST_NAME: lastName,
            PHONE: phoneArray,
            UF_CRM_1730246177575: formattedPhone,
            UF_CRM_1729960763892: source,
          },
        });

        if (contactRes.data.error) {
          throw new Error(contactRes.data.error_description || 'Failed to create contact');
        }

        contactId = contactRes.data.result;
        createdMessage += `✅ Contact created (ID: ${contactId})\n`;
      }

      if (archivedDeals.length > 0) {
        let updatedCount = 0;
        for (const deal of archivedDeals) {
          const stageId = dealType === "clinic" ? "FINAL_INVOICE" : "UC_3QISCC";
          
          const updateRes = await axios.post(`${domain}/crm.deal.update.json`, {
            id: deal.ID,
            fields: {
              STAGE_ID: stageId,
              UF_CRM_1713837376304: datetime,
              UF_CRM_1719774458545: dealType,
              UF_CRM_1736166018122: { VALUE: "Fresh" },
              ASSIGNED_BY_ID: responsibleId,
              COMMENTS: comment || deal.COMMENTS || '',
            },
          });

          if (updateRes.data.error) {
            console.error(`Failed to update deal ${deal.ID}:`, updateRes.data.error_description);
            continue;
          }

          updatedCount++;
        }
        
        if (updatedCount > 0) {
          createdMessage += `🔄 Updated ${updatedCount} archived deal(s)`;
          showToast(createdMessage, true);
          return;
        } else {
          throw new Error('Failed to update archived deals');
        }
      }

      // ✅ If no archived deals, create new one
      const stageId = dealType === "clinic" ? "FINAL_INVOICE" : "UC_3QISCC";
      const dealRes = await axios.post(`${domain}/crm.deal.add.json`, {
        fields: {
          TITLE: `New ${dealType} deal for ${formattedPhone}`,
          CONTACT_ID: contactId,
          CATEGORY_ID: 0,
          STAGE_ID: stageId,
          UF_CRM_1713837376304: datetime,
          UF_CRM_1719774458545: dealType,
          UF_CRM_1725452218751: formattedPhone,
          UF_CRM_1736166018122: { VALUE: "Fresh" },
          ASSIGNED_BY_ID: responsibleId,
          COMMENTS: comment,
        },
      });

      if (dealRes.data.error) {
        throw new Error(dealRes.data.error_description || 'Failed to create deal');
      }

      dealId = dealRes.data.result;
      createdMessage += `✅ Deal created (ID: ${dealId})`;

      showToast(createdMessage, true);
    } catch (err) {
      console.error("Submit error:", err);
      showToast(`❌ Error: ${err.message || 'Please try again.'}`, false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Submit";
    }
  });

  // ✅ Toast Notification
  function showToast(msg, reload = false) {
    Toastify({
      text: msg,
      duration: 4000,
      gravity: "top",
      position: "center",
      backgroundColor: reload ? "#28a745" : "#dc3545",
      stopOnFocus: true,
      callback: () => {
        if (reload) setTimeout(() => window.location.reload(), 300);
      },
    }).showToast();
  }
});
