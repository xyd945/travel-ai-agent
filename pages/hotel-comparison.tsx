import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/HotelComparison.module.css';

interface Hotel {
    name: string;
    address: string;
    description_struct?: Array<{
        title: string;
        paragraphs: string[];
    }>;
    amenity_groups?: Array<{
        group_name: string;
        amenities: string[];
    }>;
    images?: string[];
    star_rating?: number;
}

export default function HotelComparison() {
    const router = useRouter();
    const [googleHotel, setGoogleHotel] = useState<any>(null);
    const [mongoHotel, setMongoHotel] = useState<Hotel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (router.query.hotelData) {
            const data = JSON.parse(decodeURIComponent(router.query.hotelData as string));
            setGoogleHotel(data.googleHotel);
            setMongoHotel(data.mongoHotel);
            setLoading(false);
        }
    }, [router.query]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.comparison}>
                <div className={styles.hotelCard}>
                    <h2>Google Maps Data</h2>
                    {googleHotel && (
                        <>
                            <h3>{googleHotel.name}</h3>
                            <p>{googleHotel.formatted_address}</p>
                            {googleHotel.photos && (
                                <img 
                                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${googleHotel.photos[0].photo_reference}&key=${googleHotel.apiKey}`}
                                    alt={googleHotel.name}
                                />
                            )}
                            <p>Rating: {googleHotel.rating} ⭐ ({googleHotel.user_ratings_total} reviews)</p>
                        </>
                    )}
                </div>

                <div className={styles.hotelCard}>
                    <h2>Additional Hotel Information</h2>
                    {mongoHotel && (
                        <>
                            <h3>{mongoHotel.name}</h3>
                            <p>{mongoHotel.address}</p>
                            {mongoHotel.images && mongoHotel.images[0] && (
                                <img 
                                    src={mongoHotel.images[0].replace('{size}', '800x600')}
                                    alt={mongoHotel.name}
                                />
                            )}
                            {mongoHotel.description_struct && (
                                <div className={styles.description}>
                                    {mongoHotel.description_struct.map((desc, index) => (
                                        <div key={index}>
                                            <h4>{desc.title}</h4>
                                            {desc.paragraphs.map((p, i) => (
                                                <p key={i}>{p}</p>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {mongoHotel.amenity_groups && (
                                <div className={styles.amenities}>
                                    <h4>Amenities</h4>
                                    {mongoHotel.amenity_groups.map((group, index) => (
                                        <div key={index}>
                                            <h5>{group.group_name}</h5>
                                            <ul>
                                                {group.amenities.map((amenity, i) => (
                                                    <li key={i}>{amenity}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 