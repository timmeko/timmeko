/**
 * A/B Testing System for Tim Meko Portfolio
 * Tracks: time on page, scroll depth, portfolio clicks, LinkedIn clicks
 */

class ABTestTracker {
  constructor(config) {
    this.config = config;
    this.variant = null;
    this.startTime = Date.now();
    this.timeIntervals = [10, 30, 60, 120, 300]; // seconds
    this.scrollDepths = [25, 50, 75, 90, 100]; // percentages
    this.trackedTimeIntervals = new Set();
    this.trackedScrollDepths = new Set();
    
    this.init();
  }
  
  init() {
    if (!this.config.active) return;
    
    this.assignVariant();
    this.setupGoogleAnalytics();
    this.trackVariantAssignment();
    this.setupEventListeners();
    this.showVariant();
  }
  
  assignVariant() {
    // Get existing assignment or create new one
    let variant = localStorage.getItem('ab_test_variant');
    if (!variant || !this.config.variants.includes(variant)) {
      variant = Math.random() < this.config.splitRatio ? 
        this.config.variants[0] : this.config.variants[1];
      localStorage.setItem('ab_test_variant', variant);
      localStorage.setItem('ab_test_assigned', Date.now());
    }
    
    this.variant = variant;
    console.log('🎯 A/B Test Variant:', variant);
  }
  
  setupGoogleAnalytics() {
    if (!this.config.gaTrackingId) return;
    
    // Load Google Analytics if not already loaded
    if (!window.gtag) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.gaTrackingId}`;
      document.head.appendChild(script1);
      
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${this.config.gaTrackingId}');
      `;
      document.head.appendChild(script2);
    }
  }
  
  trackVariantAssignment() {
    this.sendAnalyticsEvent({
      event_name: `${this.config.testName}_variant_assigned`,
      variant: this.variant,
      test_name: this.config.testName
    });
  }
  
  showVariant() {
    // Add variant class to body
    document.body.classList.add(`ab-variant-${this.variant}`);
    
    // Show appropriate variant
    const variants = document.querySelectorAll('.ab-variant');
    variants.forEach(variant => {
      if (variant.classList.contains(`ab-variant-${this.variant}`)) {
        variant.style.display = 'block';
      } else {
        variant.style.display = 'none';
      }
    });
  }
  
  setupEventListeners() {
    // Time on page tracking
    this.timeIntervals.forEach(interval => {
      setTimeout(() => {
        if (!this.trackedTimeIntervals.has(interval)) {
          this.trackTimeOnPage(interval);
          this.trackedTimeIntervals.add(interval);
        }
      }, interval * 1000);
    });
    
    // Scroll depth tracking
    let ticking = false;
    const trackScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.trackScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', trackScroll, { passive: true });
    
    // Portfolio item clicks
    this.setupPortfolioClickTracking();
    
    // LinkedIn link clicks
    this.setupLinkedInClickTracking();
  }
  
  trackTimeOnPage(seconds) {
    this.sendAnalyticsEvent({
      event_name: `${this.config.testName}_time_on_page`,
      variant: this.variant,
      seconds: seconds,
      test_name: this.config.testName
    });
  }
  
  trackScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
    const winHeight = window.innerHeight;
    const scrollPercent = Math.round(((scrollTop + winHeight) / docHeight) * 100);
    
    this.scrollDepths.forEach(depth => {
      if (scrollPercent >= depth && !this.trackedScrollDepths.has(depth)) {
        this.sendAnalyticsEvent({
          event_name: `${this.config.testName}_scroll_depth`,
          variant: this.variant,
          depth_percent: depth,
          test_name: this.config.testName
        });
        this.trackedScrollDepths.add(depth);
      }
    });
  }
  
  setupPortfolioClickTracking() {
    document.addEventListener('click', (e) => {
      const portfolioItem = e.target.closest('a[href*="#featured"], a[href*="#insights"], a[href*="#editing"], a[href*="#more-work"], .featured-project a, .card a, .index-card a');
      if (portfolioItem) {
        const href = portfolioItem.href || portfolioItem.closest('a').href;
        let section = 'unknown';
        let title = 'unknown';
        let isInternal = true;
        
        // Determine section based on href or closest section
        if (href.includes('#featured') || portfolioItem.closest('.featured-project')) {
          section = 'featured';
        } else if (href.includes('#insights') || portfolioItem.closest('.insights')) {
          section = 'insights';
        } else if (href.includes('#editing') || portfolioItem.closest('.editing')) {
          section = 'editing';
        } else if (href.includes('#more-work') || portfolioItem.closest('.index')) {
          section = 'more';
        }
        
        // Get title from various possible sources
        const titleElement = portfolioItem.querySelector('.featured-project__title, .card-title, .index-title') ||
                            portfolioItem.closest('.featured-project')?.querySelector('.featured-project__title') ||
                            portfolioItem.closest('.card')?.querySelector('.card-title') ||
                            portfolioItem.closest('.index-card')?.querySelector('.index-title');
        
        if (titleElement) {
          title = titleElement.textContent.trim();
        }
        
        // Check if external link
        if (href && (href.startsWith('http') && !href.includes(window.location.hostname))) {
          isInternal = false;
        }
        
        this.sendAnalyticsEvent({
          event_name: `${this.config.testName}_portfolio_click`,
          variant: this.variant,
          portfolio_section: section,
          portfolio_title: title,
          is_internal: isInternal,
          test_name: this.config.testName
        });
      }
    });
  }
  
  setupLinkedInClickTracking() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="linkedin.com"]');
      if (link) {
        const href = link.href;
        let linkType = 'other';
        
        if (href.includes('/in/')) {
          linkType = 'profile';
        } else if (href.includes('/pulse/')) {
          linkType = 'article';
        } else if (href.includes('/company/')) {
          linkType = 'company';
        }
        
        this.sendAnalyticsEvent({
          event_name: `${this.config.testName}_linkedin_click`,
          variant: this.variant,
          link_type: linkType,
          link_url: href,
          test_name: this.config.testName
        });
      }
    });
  }
  
  sendAnalyticsEvent(eventData) {
    // Google Analytics 4 event
    if (window.gtag) {
      window.gtag('event', eventData.event_name, {
        variant: eventData.variant,
        test_name: eventData.test_name,
        custom_parameter_1: eventData.portfolio_section || eventData.link_type || eventData.seconds || eventData.depth_percent,
        custom_parameter_2: eventData.portfolio_title || eventData.link_url || eventData.is_internal
      });
    }
    
    // Console logging for debugging
    console.log('📊 A/B Test Event:', eventData);
  }
}

// Initialize A/B testing when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get config from data attribute or use default
  const testController = document.getElementById('ab-test-controller');
  let config = {
    active: false,
    splitRatio: 0.5,
    testName: 'hero-design-2025',
    variants: ['scrolling', 'traditional'],
    gaTrackingId: ''
  };
  
  if (testController) {
    config = {
      active: testController.dataset.testActive === 'true',
      splitRatio: parseFloat(testController.dataset.splitRatio) || 0.5,
      testName: testController.dataset.testName || 'hero-design-2025',
      variants: ['scrolling', 'traditional'],
      gaTrackingId: testController.dataset.gaTrackingId || ''
    };
  }
  
  window.abTestTracker = new ABTestTracker(config);
});

// Admin controls (Ctrl+Shift+A to toggle)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    
    const currentVariant = localStorage.getItem('ab_test_variant');
    const newVariant = currentVariant === 'scrolling' ? 'traditional' : 'scrolling';
    
    localStorage.setItem('ab_test_variant', newVariant);
    location.reload();
  }
});
