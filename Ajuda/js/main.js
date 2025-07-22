// DOM Elements
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

// State
let isMobile = window.innerWidth <= 768;
let sidebarCollapsed = false;
let currentTheme = localStorage.getItem('theme') || 'light';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeSidebar();
    initializeNavigation();
    handleResize();
    
    // Add event listeners
    sidebarToggle.addEventListener('click', toggleSidebar);
    themeToggle.addEventListener('click', toggleTheme);
    window.addEventListener('resize', handleResize);
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', function(e) {
        if (isMobile && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            closeMobileSidebar();
        }
    });
    
    // Handle hash navigation
    if (window.location.hash) {
        const targetSection = window.location.hash.substring(1);
        showSection(targetSection);
        updateActiveNavLink(targetSection);
    }
});

// Theme Management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
    
    // Add smooth transition effect
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

function updateThemeIcon() {
    if (currentTheme === 'dark') {
        themeIcon.className = 'fas fa-moon';
    } else {
        themeIcon.className = 'fas fa-sun';
    }
}

// Sidebar Management
function initializeSidebar() {
    if (isMobile) {
        sidebar.classList.add('mobile-hidden');
    }
}

function toggleSidebar() {
    if (isMobile) {
        toggleMobileSidebar();
    } else {
        toggleDesktopSidebar();
    }
}

function toggleMobileSidebar() {
    sidebar.classList.toggle('mobile-open');
    sidebar.classList.toggle('mobile-hidden');
    
    // Add overlay effect
    if (sidebar.classList.contains('mobile-open')) {
        createOverlay();
    } else {
        removeOverlay();
    }
}

function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    sidebar.classList.add('mobile-hidden');
    removeOverlay();
}

function toggleDesktopSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    
    // Update toggle icon
    const icon = sidebarToggle.querySelector('i');
    if (sidebarCollapsed) {
        icon.className = 'fas fa-chevron-right';
    } else {
        icon.className = 'fas fa-bars';
    }
    
    // Save state
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
}

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 998;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    overlay.addEventListener('click', closeMobileSidebar);
}

function removeOverlay() {
    const overlay = document.querySelector('.mobile-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Navigation Management
function initializeNavigation() {
    // Restore sidebar state on desktop
    if (!isMobile) {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            toggleDesktopSidebar();
        }
    }
}

function handleNavigation(e) {
    e.preventDefault();
    
    const targetSection = e.currentTarget.getAttribute('data-section');
    
    // Update URL hash
    window.history.pushState(null, null, `#${targetSection}`);
    
    // Show target section
    showSection(targetSection);
    
    // Update active nav link
    updateActiveNavLink(targetSection);
    
    // Close mobile sidebar
    if (isMobile) {
        closeMobileSidebar();
    }
    
    // Smooth scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function showSection(sectionId) {
    // Hide all sections
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Add entrance animation
        targetSection.style.opacity = '0';
        targetSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            targetSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            targetSection.style.opacity = '1';
            targetSection.style.transform = 'translateY(0)';
        }, 50);
    }
}

function updateActiveNavLink(sectionId) {
    // Remove active class from all nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current nav link
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Responsive Handling
function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    if (wasMobile !== isMobile) {
        if (isMobile) {
            // Switched to mobile
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('mobile-hidden');
            removeOverlay();
            
            // Reset toggle icon
            const icon = sidebarToggle.querySelector('i');
            icon.className = 'fas fa-bars';
        } else {
            // Switched to desktop
            sidebar.classList.remove('mobile-hidden', 'mobile-open');
            removeOverlay();
            
            // Restore collapsed state
            const savedState = localStorage.getItem('sidebarCollapsed');
            if (savedState === 'true') {
                sidebar.classList.add('collapsed');
                const icon = sidebarToggle.querySelector('i');
                icon.className = 'fas fa-chevron-right';
                sidebarCollapsed = true;
            }
        }
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add debounced resize handler
window.addEventListener('resize', debounce(handleResize, 250));

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    // ESC key closes mobile sidebar
    if (e.key === 'Escape' && isMobile) {
        closeMobileSidebar();
    }
    
    // Ctrl/Cmd + D toggles theme
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
    }
});

// Add hover effects for cards
function addHoverEffects() {
    const cards = document.querySelectorAll('.stat-card, .feature-card, .report-card, .config-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Initialize hover effects
document.addEventListener('DOMContentLoaded', addHoverEffects);

// Add intersection observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.stat-card, .feature-card, .feature-item, .report-card, .config-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add search functionality (future enhancement)
function initializeSearch() {
    // This could be expanded to add search functionality
    // For now, it's a placeholder for future enhancements
}

// Performance optimization
function optimizePerformance() {
    // Lazy load images if any
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', optimizePerformance);

// Export functions for potential external use
window.MetalmaOS = {
    toggleTheme,
    toggleSidebar,
    showSection,
    updateActiveNavLink
};

