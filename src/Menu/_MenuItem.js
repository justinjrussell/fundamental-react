import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

const MenuItem = ({
    addonAfter,
    addonBefore,
    url,
    isLink,
    children,
    onClick,
    className,
    addonProps,
    urlProps,
    separator,
    active,
    disabled,
    selected,
    ...props
}) => {

    const addonBeforeClassnames = classnames(
        'fd-menu__addon-before',
        {
            [`sap-icon--${addonBefore}`]: !!addonBefore
        }
    );

    const addonAfterClassnames = classnames(
        'fd-menu__addon-after',
        {
            [`sap-icon--${addonAfter}`]: !!addonAfter
        }
    );

    const linkClassNames = classnames(
        'fd-menu__link',
        {
            'is-active': active,
            'is-selected': selected,
            'is-disabled': disabled
        }
    );

    const renderLink = () => {
        if (url) {
            return (<a {...urlProps}
                className={linkClassNames}
                href={url}
                onClick={onClick}
                role='menuitem'>
                {addonBefore && <span {...addonProps} className={addonBeforeClassnames} />}
                <span className='fd-menu__title'>{children}</span>
                {addonAfter && <span {...addonProps} className={addonAfterClassnames} />}
            </a>);
        } else if (children && React.isValidElement(children)) {
            const childrenClassnames = classnames(
                linkClassNames,
                children.props.className
            );

            return (
                <>
                    {addonBefore && <span {...addonProps} {...urlProps}
                        className={addonBeforeClassnames} />}
                    <span className='fd-menu__title'>
                        {React.Children.map(children, child => {
                            return React.cloneElement(child, {
                                className: childrenClassnames,
                                ...urlProps
                            });
                        })}
                    </span>
                    {addonAfter && <span {...addonProps} {...urlProps}
                        className={addonAfterClassnames} />}
                </>
            );
        } else if (children) {
            return (<a {...urlProps}
                className={linkClassNames}
                onClick={onClick}
                role='menuitem'>
                {addonBefore && <span {...addonProps} className={addonBeforeClassnames} />}
                <span className='fd-menu__title'>{children}</span>
                {addonAfter && <span {...addonProps} className={addonAfterClassnames} />}
            </a>);
        }
    };

    const listClassNames = classnames(
        'fd-menu__item',
        className
    );

    return (
        <>
            <li
                {...props}
                className={listClassNames}
                role='presentation'>
                {renderLink()}
            </li>
            {separator && <span className='fd-menu__separator' />}
        </>
    );
};

MenuItem.displayName = 'Menu.Item';

MenuItem.propTypes = {
    /** Set to **true** to apply active style */
    active: PropTypes.bool,
    /** Name of the SAP icon to be applied as an add-on before the text */
    addonAfter: PropTypes.string,
    /** Name of the SAP icon to be applied as an add-on after the text */
    addonBefore: PropTypes.string,
    /** Additional props to be spread to the add-ons */
    addonProps: PropTypes.object,
    /** Node(s) to render within the component */
    children: PropTypes.node,
    /** CSS class(es) to add to the element */
    className: PropTypes.string,
    /** Set to **true** to mark component as disabled and make it non-interactive */
    disabled: PropTypes.bool,
    /** Set to **true** to style as a link */
    isLink: PropTypes.bool,
    /** Set to **true** to apply selected style */
    selected: PropTypes.bool,
    /** Set to **true** to place a separator after list item */
    separator: PropTypes.bool,
    /** Enables use of `<a>` element. Value to be applied to the anchor\'s `href` attribute.
     * Should use either `link` or `url`, but not both. */
    url: PropTypes.string,
    /** Additional props to be spread to the Menu Item links (when using `url`). */
    urlProps: PropTypes.object,
    /**
     * Callback function; triggered when the MenuItem (i.e. the `<a>` element) is clicked.
     *
     * @param {SyntheticEvent} event - React's original SyntheticEvent. See https://reactjs.org/docs/events.html.
     * @returns {void}
    */
    onClick: PropTypes.func
};

export default MenuItem;
