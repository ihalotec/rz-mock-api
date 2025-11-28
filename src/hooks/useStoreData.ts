import { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { Project, MockEndpoint, MockResponse } from '../lib/types';

export function useProjects(): Project[] {
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        const update = () => setProjects(store.getProjects());
        update(); // Initial fetch
        return store.subscribe(update);
    }, []);

    return projects;
}

export function useProject(projectId?: string): Project | undefined {
    const [project, setProject] = useState<Project | undefined>(undefined);

    useEffect(() => {
        if (!projectId) return;
        const update = () => setProject(store.getProject(projectId));
        update();
        return store.subscribe(update);
    }, [projectId]);

    return project;
}

export function useEndpoints(projectId?: string): MockEndpoint[] {
    const [endpoints, setEndpoints] = useState<MockEndpoint[]>([]);

    useEffect(() => {
        if (!projectId) return;
        const update = () => setEndpoints(store.getEndpoints(projectId));
        update();
        return store.subscribe(update);
    }, [projectId]);

    return endpoints;
}

export function useResponses(endpointId?: string): MockResponse[] {
    const [responses, setResponses] = useState<MockResponse[]>([]);

    useEffect(() => {
        if (!endpointId) return;
        const update = () => setResponses(store.getResponses(endpointId));
        update();
        return store.subscribe(update);
    }, [endpointId]);

    return responses;
}