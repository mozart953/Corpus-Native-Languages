import { useEffect } from "react";
import "./Login.css";


function LoginComponent(){

    useEffect(()=>{
        console.log("Hello world")
    },[])

    return(
        <>
            <div className="mainCard">
                <form action="" className="loginForm">
                    <div className="user">
                        <label htmlFor="user">User</label>
                        <input type="text" name="user" id="user"/>
                    </div>
                    <div className="password">
                        <label htmlFor="pass">Password</label>
                        <input type="password"  name="pass" id="pass"/>
                    </div>
                    <div>
                        <button type="submit" id="enter"> Entrar</button>
                    </div>
                </form>
            </div>
        </>
    );

}


export default LoginComponent;
