/* ============================================================
   ELYRIA BIO — AFFILIATE PROGRAM / form handling
   ============================================================ */
(function () {
  "use strict";
  var form = document.getElementById("applyForm");
  var card = document.getElementById("applyCard");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = (document.getElementById("fName").value || "there").split(" ")[0];
    card.innerHTML = "<div class='form-success'>"
      + "<div class='fs-ic'><svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M20 6L9 17l-5-5'/></svg></div>"
      + "<h3>Application received</h3>"
      + "<p>Thanks, " + name + ". We'll review your channel and reply within two business days. Approved partners get a unique code, a referral link, and access to the partner dashboard.</p>"
      + "<div style='margin-top:22px'><a href='Elyria Bio Affiliate Portal.html' class='btn btn-ghost'>Preview the partner portal</a></div>"
      + "</div>";
    window.scrollTo({ top: card.getBoundingClientRect().top + window.pageYOffset - 120, behavior: "smooth" });
  });
})();
