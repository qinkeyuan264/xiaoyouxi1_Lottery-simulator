import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/components/router/AppRouter";

/**
 * 根组件：挂载路由（含登录态保护）。
 */
function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
