document.getElementById('loginBtn').addEventListener('click', function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    // Firebase Authentication login
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;

            // Check if the user is an admin
            if (email === "admin@example.com") { 
                window.location.href = "adminpage.html"; 
            } else {
                window.location.href = "dashboard.html"; // Redirect to user dashboard
            }
        })
        .catch(error => {
            alert(error.message); // Show Firebase error messages
        });
});
