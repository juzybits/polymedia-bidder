import React from 'react';

export type Tab = {
    name: string;
    icon: React.ReactNode;
};

export function makeTabs<T extends readonly Tab[]>(tabs: T)
{
    const names = tabs.map(tab => tab.name);
    type TabName = (typeof names)[number];

    const isTabName = (str: string): str is TabName => {
        return names.includes(str as TabName);
    };

    return {
        all: tabs,
        isTabName,
    };
}

export const TabsHeader: React.FC<{
    tabs: Array<Tab>,
    activeTab: string,
    onChangeTab: (tab: string) => void,
}> = ({
    tabs,
    activeTab,
    onChangeTab,
}) => {
    return (
        <div className="tabs-header">
            {tabs.map((tab) => (
                <SingleTab
                    key={tab.name}
                    tab={tab}
                    activeTab={activeTab}
                    onChangeTab={onChangeTab}
                />
            ))}
        </div>
    );
};

const SingleTab: React.FC<{
    tab: Tab,
    activeTab: string,
    onChangeTab: (tab: string) => void,
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
        >
            {tab.icon}
        </div>
    );
};
