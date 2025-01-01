import React from "react";

export type Tab = {
    name: string;
    tooltip?: string;
    icon?: React.ReactNode;
};

export function makeTabs<T extends readonly Tab[]>(tabs: T)
{
    const names = tabs.map(tab => tab.name);
    type TabName = (typeof names)[number];

    const isTabName = (str: string | undefined): str is TabName => {
        return typeof str === "string" && names.includes(str);
    };

    return {
        all: tabs,
        isTabName,
    };
}

export const HeaderTabs: React.FC<{
    tabs: Tab[];
    activeTab: string;
    onChangeTab: (tab: string) => void;
    disabled?: boolean;
}> = ({
    tabs,
    activeTab,
    onChangeTab,
    disabled,
}) => {
    return (
        <div className="tabs-header">
            {tabs.map((tab) => (
                <SingleTab
                    key={tab.name}
                    tab={tab}
                    activeTab={activeTab}
                    onChangeTab={() => !disabled && onChangeTab(tab.name)}
                />
            ))}
        </div>
    );
};

const SingleTab: React.FC<{
    tab: Tab;
    activeTab: string;
    onChangeTab: (tab: string) => void;
}> = ({
    tab,
    activeTab,
    onChangeTab,
}) => {
    const isSelected = tab.name === activeTab;
    return (
        <div
            className={`tab-title ${isSelected ? "selected" : ""}`}
            onClick={() => onChangeTab(tab.name)}
            title={tab.tooltip}
        >
            {tab.icon && <div className="tab-icon">{tab.icon}</div>}
            {!tab.icon && <div className="tab-text">{tab.name}</div>}
        </div>
    );
};
