import { useState, useEffect, createContext, useContext } from 'react';
import { CSSTransition } from 'react-transition-group';

const __DEV__ = process.env.NODE_ENV === 'development';
const PROGRESS_URL = `progress?host=site&pathname=${window.location.pathname}`;

//Context
export const AuthContext = createContext({} as AuthContextProps);

export type UserInfo = {
    uid: string;
    name: string;
    email: string;
};

interface AuthContextProps {
    getProgress: () => void;
    userInfo: UserInfo;
    progress: string | null;
    setProgress: (progress: string) => void;
    updateUserInfo: (userInfo: Partial<UserInfo>) => void;
}

const apiUrl = __DEV__
    ? 'http://localhost:5000/'
    : 'https://pet-site-api.herokuapp.com/';

interface APIResponse {
    status: number;
    [key: string]: any;
}

const processResponse = async (response: Response): Promise<APIResponse> => {
    let returnData: any = {};
    if (response.ok) {
        returnData = await response.json();
    } else {
        returnData = {
            error: response.statusText,
        };
    }
    returnData.status = response.status;
    return returnData;
};

interface Props {
    children: React.ReactNode;
}

export default function Auth(props: Props) {
    const [progress, updateProgress] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); //for curtain
    const [userInfo, setUserInfo] = useState<UserInfo>(
        localStorage.getItem('userInfo')
            ? JSON.parse(localStorage.getItem('userInfo') || '')
            : { uid: 'empty', name: '', email: '' }
    );

    const updateUserInfo = (userInfo: Partial<UserInfo>) => {
        setUserInfo((info) => {
            return {
                ...info,
                ...userInfo,
            };
        });
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
    };

    const apiGet = async (path: string, options = {}) => {
        try {
            const response = await fetch(apiUrl + path, {
                ...options,
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: userInfo.uid || '',
                },
            });
            return await processResponse(response);
        } catch (error) {
            return {
                error: 'Connection error',
                status: 500,
            };
        }
    };

    const apiPost = async (path: string, body = {}, options = {}) => {
        try {
            const response = await fetch(apiUrl + path, {
                ...options,
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: userInfo.uid || '',
                },
            });
            return await processResponse(response);
        } catch (error) {
            return {
                error: 'Connection error',
                status: 500,
            };
        }
    };

    const getProgress = async () => {
        const response = await apiGet(PROGRESS_URL);
        if (Math.floor(response.status / 100) === 2) {
            if (response.status === 200) {
                updateProgress(response.progress);
            } else if (response.status === 201) {
                updateProgress('newUser');
            }

            if (!__DEV__) setTimeout(() => setLoading(false), 400);
            else setLoading(false);
        } else setLoading(true);
    };

    const setProgress = async (progress: string) => {
        const response = await apiPost(PROGRESS_URL, { progress });
        if (response.status === 200) {
            updateProgress(progress);
        }
    };

    useEffect(() => {
        if (userInfo.uid && !progress) getProgress();
    }, [userInfo]);

    return (
        <AuthContext.Provider
            value={{
                getProgress,
                progress,
                setProgress,
                userInfo,
                updateUserInfo,
            }}
        >
            <CSSTransition in={loading} timeout={0} classNames="curtainHolder">
                <div>
                    <div className="curtainLeft" />
                    <div className="curtainRight" />
                </div>
            </CSSTransition>
            {props.children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within a AuthProvider');
    }
    return context;
};