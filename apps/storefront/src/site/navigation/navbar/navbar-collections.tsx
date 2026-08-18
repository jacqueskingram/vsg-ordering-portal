import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuTrigger,
    NavigationMenuContent,
    NavigationMenuLink,
} from '@/components/ui/navigation-menu';

export async function NavbarCollections() {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`navbar-collections-${locale}`);

    const collections = await getTopCollections(locale);

    return (
        <NavigationMenu>
            <NavigationMenuList>
                <NavigationMenuItem>
                    <NavigationMenuTrigger>{locale === 'de' ? 'Kategorien' : 'Collections'}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <ul className="grid w-56 gap-1">
                            {collections.map((collection) => (
                                <li key={collection.slug}>
                                    <NavigationMenuLink
                                        render={
                                            <a
                                                href={`/${locale}/collection/${collection.slug}`}
                                                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                                            />
                                        }
                                    >
                                        {collection.name}
                                    </NavigationMenuLink>
                                </li>
                            ))}
                        </ul>
                    </NavigationMenuContent>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    );
}
