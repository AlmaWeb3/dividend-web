import React from 'react';
import './LanguageSelector.css';

function LanguageSelector({ currentLang, onLanguageChange }) {
  return (
    <div className="language-selector">
      <button 
        className={currentLang === 'zh' ? 'active' : ''} 
        onClick={() => onLanguageChange('zh')}
      >
        中文
      </button>
      <button 
        className={currentLang === 'en' ? 'active' : ''} 
        onClick={() => onLanguageChange('en')}
      >
        English
      </button>
    </div>
  );
}

export default LanguageSelector; 