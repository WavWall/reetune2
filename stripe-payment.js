function sendToFlutter(message) {
  console.log('Sending to Flutter:', message);
  
  if (window.FlutterChannel) {
    console.log('Using FlutterChannel');
    window.FlutterChannel.postMessage(message);
  } else if (window.parent !== window) {
    console.log('Using window.parent.postMessage');
    window.parent.postMessage(message, '*');
  } else {
    console.log('No Flutter communication channel available');
  }
}

const urlParams = new URLSearchParams(window.location.search);
const clientSecret = urlParams.get('cs');

if (!clientSecret) {
  document.getElementById('loading').innerHTML =
    '<div style="color:#e53e3e;">Error: Missing clientSecret (cs) in URL parameters</div>';
} else {
  initializeStripe();
}

function initializeStripe() {
  try {
    const stripe = Stripe('pk_test_51RJbsPGPuGNyByArGEcYM4hBdRmPgZd641ZanM7jjuFSzlZ4YoWPhUvQz4kXIWgddoJiKsf6tVGuIV3Bfc8txIfx00kgLl2b4r'); 
    const elements = stripe.elements({ 
      clientSecret, 
      appearance: { 
        theme: 'stripe', 
        variables: { colorPrimary: '#635bff' } 
      } 
    });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');

    paymentElement.on('ready', () => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('payment-container').style.display = 'block';
    });

    paymentElement.on('loaderror', (event) => {
      console.error('Payment element error:', event);
      const errorDiv = document.getElementById('error-message');
      errorDiv.textContent = 'Error loading payment form: ' + event.error.message;
      errorDiv.style.display = 'block';
      document.getElementById('loading').style.display = 'none';
      document.getElementById('payment-container').style.display = 'block';
    });

    const form = document.getElementById('payment-form');
    const submitBtn = document.getElementById('submit-btn');
    const spinner = document.getElementById('spinner');
    const buttonText = document.getElementById('button-text');
    const errorDiv = document.getElementById('error-message');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      spinner.classList.remove('hidden');
      buttonText.textContent = 'Processing...';
      errorDiv.style.display = 'none';

      try {
        const {error, paymentIntent} = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required'
        });

        if (error) {
          errorDiv.textContent = error.message;
          errorDiv.style.display = 'block';
          sendToFlutter(JSON.stringify({ 
            type: 'PAYMENT_ERROR', 
            message: error.message 
          }));
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          sendToFlutter('PAYMENT_SUCCESS');
        }
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
        sendToFlutter(JSON.stringify({ 
          type: 'PAYMENT_ERROR', 
          message: err.message 
        }));
      } finally {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
        buttonText.textContent = 'Pay Now';
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    document.getElementById('loading').innerHTML =
      '<div style="color:#e53e3e;">Error initializing Stripe: ' + error.message + '</div>';
  }
}