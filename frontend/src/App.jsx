import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import DocumentSources from './DocumentSources'


const firstMessage = {
  role: 'assistant',
  text: '내 문서를 추가한 뒤 질문해 보세요.',
}


function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [approved, setApproved] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([firstMessage])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 새로고침 뒤에도 Supabase가 저장한 세션을 다시 읽습니다.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setApproved(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) checkApproval(session)
  }, [session?.access_token])

  async function checkApproval(currentSession) {
    // 화면 표시용입니다. 백엔드도 매 요청에서 다시 확인합니다.
    const { data, error } = await supabase.from('approved_users')
      .select('user_id').eq('user_id', currentSession.user.id).maybeSingle()
    if (error) { setAuthError(error.message); return }
    setApproved(Boolean(data))
  }

  async function signUp() {
    setAuthError('')
    const { error } = await supabase.auth.signUp({ email, password })
    setAuthError(error ? error.message : '가입 완료. 관리자 승인을 기다리세요.')
  }

  async function signIn() {
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    setApproved(false)
    if (error) setAuthError(error.message)
  }

  async function send(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || !session || !approved || loading) return

    setMessages((current) => [...current, { role: 'user', text: trimmed }])
    setQuestion('')
    setLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question: trimmed }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`)
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: data.answer },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: `연결 오류: ${error.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="header">
        <span className="eyebrow">KION LABS · LLM 애플리케이션 개발</span>
        <h1>나의 문서 질문 챗봇</h1>
        <p>회원가입 후 승인받으면 본인의 문서에 질문할 수 있습니다.</p>
        <div className="auth-row">
          {session ? (
            <button type="button" onClick={signOut}>로그아웃</button>
          ) : null}
          <span role="status">{authError}</span>
        </div>
      </header>

      {session && approved ? (
        <>
          <DocumentSources session={session} />
          <section className="chat" aria-label="대화 내용">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={index}>
                <span className="role">{message.role === 'user' ? '나' : '챗봇'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {loading && <p className="status">답변을 작성하고 있습니다...</p>}
          </section>
          <form className="composer" onSubmit={send}>
            <label htmlFor="question">질문</label>
            <div className="input-row">
              <input
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="예: UX와 UI는 어떻게 다른가요?"
                maxLength={500}
              />
              <button type="submit" disabled={loading || !question.trim()}>
                보내기
              </button>
            </div>
          </form>
        </>
      ) : session ? (
        <section className="welcome">
          <h2>승인 대기 중</h2>
          <p>프로젝트 소유자가 내 계정을 확인한 뒤 승인합니다.</p>
          <button type="button" onClick={() => checkApproval(session)}>승인 상태 새로고침</button>
        </section>
      ) : (
        <section className="welcome auth-panel">
          <h2>회원가입 또는 로그인</h2>
          <label htmlFor="email">이메일</label>
          <input id="email" type="email" value={email}
            onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">비밀번호</label>
          <input id="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)} />
          <div className="auth-actions">
            <button type="button" onClick={signUp} disabled={!authReady}>회원가입</button>
            <button type="button" onClick={signIn} disabled={!authReady}>로그인</button>
          </div>
        </section>
      )}
    </main>
  )
}

export default App

