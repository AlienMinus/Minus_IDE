const fileTree = [
    {
        id: "src",
        name: "src",
        type: "folder",
        isOpen: true,
        path: "src",
        children: [

            {
                id: "components",
                name: "components",
                type: "folder",
                isOpen: true,
                path: "src/components",
                children: [

                    {
                        id: "navbar",
                        name: "Navbar.jsx",
                        type: "file",
                        language: "javascript",
                        path: "src/components/Navbar.jsx",
                        content: `function Navbar(){

    return(
        <div>Navbar</div>
    );

}

export default Navbar;`
                    },

                    {
                        id: "sidebar",
                        name: "Sidebar.jsx",
                        type: "file",
                        language: "javascript",
                        path: "src/components/Sidebar.jsx",
                        content: `function Sidebar(){

    return(
        <div>Sidebar</div>
    );

}

export default Sidebar;`
                    }

                ]

            },

            {
                id: "pages",
                name: "pages",
                type: "folder",
                isOpen: true,
                path: "src/pages",
                children: [

                    {
                        id: "home",
                        name: "HomePage.jsx",
                        type: "file",
                        language: "javascript",
                        path: "src/pages/HomePage.jsx",
                        content: `function HomePage(){

    return(
        <h1>Home</h1>
    );

}

export default HomePage;`
                    }

                ]

            },

            {
                id: "app",
                name: "App.jsx",
                type: "file",
                language: "javascript",
                path: "src/App.jsx",
                content: `function App(){

    return <h1>Hello</h1>;

}

export default App;`
            },

            {
                id: "css",
                name: "App.css",
                type: "file",
                language: "css",
                path: "src/App.css",
                content: `body{

    margin:0;

}`
            }

        ]

    }

];

export default fileTree;