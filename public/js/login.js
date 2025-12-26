document.addEventListener("DOMContentLoaded", () => {
  // Handle form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (email && password) {
        const loginBtn = document.querySelector('.login-btn');
        loginBtn.textContent = 'Signing In...';
        loginBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        
        setTimeout(() => {
          loginBtn.textContent = '✓ Welcome Back!';
          setTimeout(() => {
            alert('Login successful! Redirecting to dashboard...');
          }, 1000);
        }, 1500);
      }
    });
  }

  // Handle Google login
  const googleLogin = document.getElementById('googleLogin');
  if (googleLogin) {
    googleLogin.addEventListener('click', function() {
      this.style.background = '#f8f9fa';
      this.innerHTML = '<div style="width: 20px; height: 20px; border: 2px solid #4285f4; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Connecting...';
      
      setTimeout(() => {
        this.innerHTML = '✓ Google Connected!';
        this.style.background = '#4CAF50';
        this.style.color = 'white';
        this.style.borderColor = '#4CAF50';
        
        setTimeout(() => {
          alert('Google login successful! Redirecting to dashboard...');
        }, 1000);
      }, 2000);
    });
  }

  // Add input focus animations
  document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.transform = 'translateX(5px)';
    });
    input.addEventListener('blur', function() {
      this.parentElement.style.transform = 'translateX(0)';
    });
  });
});