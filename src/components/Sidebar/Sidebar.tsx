import React from "react";
import "./Sidebar.css";
import { RiDraftLine } from "react-icons/ri";
import ModeoLogo from "../../assets/modeoLogo.png";

type NavItem = {
    id: string;
    label: string;
    href?: string;
    icon?: React.ReactNode;
};

const NAV: NavItem[] = [
    // { id: "home", label: "Accueil", href: "/", icon: <HiOutlineHome /> },
    {
        id: "drafts",
        label: "Brouillons",
        href: "/modeo-front/drafts",
        icon: <RiDraftLine />,
    },
    // { id: "sites", label: "Sites", href: "/sites" },
    // { id: "favs", label: "Favoris", href: "/favorites" },
    // { id: "requests", label: "Demandes", href: "/requests" },
    // { id: "settings", label: "Paramètres", href: "/settings" },
];

export default function Sidebar() {
    return (
        <aside className="mo-sidebar" aria-label="Navigation principale">
            <div className="mo-sidebar__brand">
                <div className="mo-sidebar__logo" aria-hidden>
                    <img src={ModeoLogo} alt="Modeo Logo" />
                </div>
                <h1 className="mo-sidebar__title">Modeo</h1>
            </div>

            <nav className="mo-sidebar__nav" aria-label="Menu">
                <ul>
                    {NAV.map((item) => (
                        <li key={item.id} className="mo-sidebar__item">
                            <a className="mo-sidebar__link" href={item.href}>
                                <span className="mo-sidebar__icon" aria-hidden>
                                    {item.icon ?? "•"}
                                </span>
                                <span className="mo-sidebar__label">{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="mo-sidebar__footer">
                <a className="mo-sidebar__privacy" href="/modeo-front/privacy">
                    Politique de confidentialité
                </a>
            </div>
        </aside>
    );
}
