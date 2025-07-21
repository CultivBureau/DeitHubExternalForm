document.addEventListener('DOMContentLoaded', function () {
  const token = "1mcchkcck1kxs0sz";
  const domain = "https://diet-hub.bitrix24.com/rest/79257/" + token;

  const form = document.getElementById("ditehubForm");
  const phoneInput = document.getElementById("phone");
  const submitBtn = form.querySelector("button[type='submit']");

  let contactId = null;
  let dealId = null;

  // ✅ Message under phone input
  const message = document.createElement('div');
  message.style.fontSize = '0.95em';
  message.style.marginTop = '0.25em';
  phoneInput.closest('.input-group')?.insertAdjacentElement('afterend', message);

  // ✅ Phone normalization
  function formatPhone(number) {
    number = number.trim().replace(/\D/g, '');
    if (number.length === 10 && number[0] !== '0') number = '0' + number;
    if (number.length === 11 && number.startsWith('0')) return '+2' + number;
    return number;
  }

  // ✅ Debounce
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ✅ Realtime Contact & Deal Check
  const checkPhone = debounce(async () => {
    const rawPhone = phoneInput.value;
    const formattedPhone = formatPhone(rawPhone);
    if (!/^\+20\d{10}$/.test(formattedPhone)) {
      contactId = null;
      dealId = null;
      message.textContent = "";
      submitBtn.disabled = false;
      return;
    }

    message.textContent = "🔍 Searching...";
    message.style.color = "gray";
    submitBtn.disabled = true;

    try {
      // Check contact
      const contactRes = await fetch(`${domain}/crm.duplicate.findbycomm.json?type=PHONE&values[]=${encodeURIComponent(formattedPhone)}`);
      const contactData = await contactRes.json();
      contactId = contactData.result?.CONTACT?.[0] || null;

      // Check deal
      const dealRes = await fetch(`${domain}/crm.deal.list.json?FILTER[CONTACT_ID]=${contactId}`);
      console.log(dealRes.json.data);
      const dealData = await dealRes.json();
      const invalidStages = ["Archived", "Deal lost", "Unreachable", "Test or Spam"];
      const validDeal = dealData.result?.find(d => !invalidStages.includes(d.STAGE_ID));
      dealId = validDeal?.ID || null;

      if (contactId && dealId) {
        message.textContent = `⚠ Contact exists (ID: ${contactId}) with active deal (ID: ${dealId}). Cannot submit.`;
        message.style.color = "red";
        submitBtn.disabled = true;
      } else if (contactId) {
        message.textContent = `✔ Contact exists (ID: ${contactId}). No active deal — ready to submit.`;
        message.style.color = "orange";
        submitBtn.disabled = false;
      } else {
        message.textContent = `✔ No existing contact — new one will be created.`;
        message.style.color = "green";
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error("Check error:", err);
      message.textContent = "❌ Error checking system.";
      message.style.color = "red";
      submitBtn.disabled = false;
    }
  }, 500);

  phoneInput.addEventListener("input", checkPhone);

  // ✅ Form Submit Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawPhone = phoneInput.value.trim();
    const formattedPhone = formatPhone(rawPhone);

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

    if (dealId) {
      showToast("⚠️ Active deal already exists. Cannot create new deal.", false);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Creating...`;

    try {
      let createdMessage = "";

      // Create Contact if needed
      if (!contactId) {
        const contactRes = await axios.post(`${domain}/crm.contact.add.json`, {
          fields: {
            NAME: firstName,
            LAST_NAME: lastName,
            PHONE: [{ VALUE: formattedPhone, VALUE_TYPE: "WORK" }],
            UF_CRM_1730246177575: formattedPhone,
            UF_CRM_1729960763892: source,
          },
        });
        contactId = contactRes.data.result;
        createdMessage += `✅ Contact created (ID: ${contactId})\n`;
      }

      // Create Deal
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
      dealId = dealRes.data.result;
      createdMessage += `✅ Deal created (ID: ${dealId})`;

      showToast(createdMessage, true);
    } catch (err) {
      console.error("Submit error:", err);
      showToast("❌ Error during submission. Please try again.", false);
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
      backgroundColor: "#28a745",
      stopOnFocus: true,
      callback: () => {
        if (reload) setTimeout(() => window.location.reload(), 300);
      },
    }).showToast();
  }
});
