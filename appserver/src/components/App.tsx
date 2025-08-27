import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import { useAccount } from "wagmi";
import { Header } from "./Header";
import { UserInfo } from "./UserInfo";
import { BlockchainActions } from "./BlockchainActions";
import { Checkout } from "./Checkout";
import './App.css';

function App() {
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { address, connector } = useAccount();

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
      console.log(...args);
    }
  }

  return (
    <div className="dashboard">
      <Header
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={disconnect}
        connectLoading={connectLoading}
        disconnectLoading={disconnectLoading}
      />

      <div className="dashboard-content">
        <UserInfo
          isConnected={isConnected}
          address={address}
          connector={connector}
          userInfo={userInfo}
          onGetUserInfo={() => uiConsole(userInfo)}
        />

        <BlockchainActions isConnected={isConnected} />

        <Checkout isConnected={isConnected} userAddress={address} />
      </div>

      {connectLoading && <div className="loading">Connecting...</div>}
      {connectError && <div className="error">{connectError.message}</div>}
      {disconnectLoading && <div className="loading">Disconnecting...</div>}
      {disconnectError && <div className="error">{disconnectError.message}</div>}

      <div id="console" className="console">
        <p></p>
      </div>
    </div>
  );
}

export default App;