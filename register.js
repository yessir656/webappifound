window.onload = function() {
    console.log(" Page fully loaded. Register script executing...");

    document.getElementById("registerButton").addEventListener("click", function () {
        console.log("Register button clicked!");

        const studentId = document.getElementById("studentId").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value.trim();

        if (!studentId || !email || !password) {
            alert(" Please fill in all fields.");
            return;
        }

        console.log(" Registering user with Firebase...");

        // Register user with Firebase Authentication
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                console.log("✅ User registered:", user.uid);

                // Store user details in Firestore
                return db.collection("users").doc(user.uid).set({
                    studentId: studentId,
                    email: email,
                    userId: user.uid
                });
            })
            .then(() => {
                console.log(" User data saved to Firestore.");
                alert("🎉 Registration successful! Redirecting to login...");
                window.location.href = "login.html"; // Redirect to login page
            })
            .catch(error => {
                console.error(" Firebase error:", error);
                alert(error.message);
            });
    });
};
