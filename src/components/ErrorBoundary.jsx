import React from 'react';

/**
 * 予期せぬエラーで画面が真っ白になるのを防ぐセーフティネットコンポーネント
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          maxWidth: '560px',
          margin: '40px auto',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          textAlign: 'center',
          border: '1.5px solid #f0cfc5',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌿</div>
          <h2 style={{ fontSize: '1.25rem', color: '#c26549', marginBottom: '8px' }}>
            表示中にエラーが発生しました
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6e7771', lineHeight: '1.6', marginBottom: '20px' }}>
            申し訳ありません。画面の読み込み中に問題が発生したため安全に停止しました。
          </p>
          {this.state.error && (
            <pre style={{
              background: '#faeee9',
              padding: '12px',
              borderRadius: '8px',
              color: '#a14e36',
              fontSize: '0.8rem',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '20px'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              background: '#587b66',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ページを再読み込みする
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

