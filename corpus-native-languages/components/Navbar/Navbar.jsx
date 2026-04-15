import Link from "next/link";
import "./Navbar.css";

function NavbarComponent(){

    const routes=[{id:1, link:"/", name:"Home"}, 
                  {id:2, link:"/login", name:"Login"}];

    return(
        <nav className="Navbar bg-sky-600">  
            {routes.map( val=>
                <Link href={val.link} key={val.id} className="iniLinks">{val.name}</Link>
            )}                                  
        </nav>
    );

}

export default NavbarComponent;