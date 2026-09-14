import { RouterProvider } from 'react-router-dom'
import { router } from './routes.jsx'
import { AuthProvider } from './context/AuthContext'
import { PacienteAuthProvider } from './context/PacienteAuthContext'

export default function App() {
  return (
    <AuthProvider>
      <PacienteAuthProvider>
        <RouterProvider router={router} />
      </PacienteAuthProvider>
    </AuthProvider>
  )
}