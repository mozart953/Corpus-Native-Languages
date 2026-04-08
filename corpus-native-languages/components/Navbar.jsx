import Link from "next/link";

function NavbarComponent(){

    

    return(
        <nav>
            <ul>
                <Link href="/">Home</Link>
                <li>Login</li>
            </ul>
        </nav>
    );

}

export default NavbarComponent;